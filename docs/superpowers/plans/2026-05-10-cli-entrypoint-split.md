# CLI Entrypoint Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the CLI package executable wrapper into `apps/cli/src/main.ts` while keeping `apps/cli/src/index.ts` as a side-effect-free public API surface.

**Architecture:** `main.ts` becomes the only process entrypoint: it reads `Bun.argv`, calls `dispatchCliCommand`, writes stdout or stderr, and sets the exit code on failure. `index.ts` keeps exports only. `apps/cli/package.json` points the `the-agent` bin at `./src/main.ts`.

**Tech Stack:** Bun test runner, TypeScript ES modules, current `apps/cli` dispatcher and command modules.

---

## File Structure

- Create `apps/cli/src/main.ts`: executable process wrapper only.
- Modify `apps/cli/src/index.ts`: remove the dispatcher import and `import.meta.main` block; keep public exports unchanged.
- Modify `apps/cli/src/index.test.ts`: add a focused regression test for the entrypoint boundary.
- Modify `apps/cli/package.json`: update `bin["the-agent"]` to `./src/main.ts`.

Do not change command names, dispatcher behavior, command output formatting, provider logic, doctor checks, or live-readiness configuration.

### Task 1: Dedicated CLI Entrypoint

**Files:**
- Create: `apps/cli/src/main.ts`
- Modify: `apps/cli/src/index.ts`
- Modify: `apps/cli/src/index.test.ts`
- Modify: `apps/cli/package.json`

- [ ] **Step 1: Write the failing test**

Replace `apps/cli/src/index.test.ts` with this complete file:

```ts
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as cli from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPackageRoot = resolve(__dirname, "..");

const readCliPackageFile = (relativePath: string): string => {
  return readFileSync(resolve(cliPackageRoot, relativePath), "utf8");
};

describe("CLI public API", () => {
  test("exports every implemented world command helper", () => {
    const exports = cli as unknown as Readonly<Record<string, unknown>>;

    expect(typeof exports.listWorldSubscriptionsCommand).toBe("function");
    expect(typeof exports.searchWorldCommand).toBe("function");
    expect(typeof exports.subscribeWorldCommand).toBe("function");
    expect(typeof exports.pullWorldCommand).toBe("function");
    expect(typeof exports.verifyWorldTransmissionCommand).toBe("function");
  });
});

describe("CLI entrypoint boundary", () => {
  test("uses a dedicated process entrypoint", () => {
    const packageJson = JSON.parse(readCliPackageFile("package.json")) as {
      bin?: Record<string, string>;
    };

    expect(packageJson.bin?.["the-agent"]).toBe("./src/main.ts");

    const mainPath = resolve(cliPackageRoot, "src/main.ts");
    const mainSource = readCliPackageFile("src/main.ts");
    const indexSource = readCliPackageFile("src/index.ts");

    expect(existsSync(mainPath)).toBe(true);
    expect(mainSource).toContain('import { dispatchCliCommand } from "./dispatcher.js";');
    expect(mainSource).toContain("dispatchCliCommand(Bun.argv.slice(2))");
    expect(indexSource).not.toContain("import.meta.main");
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
bun test apps/cli/src/index.test.ts -t "uses a dedicated process entrypoint"
```

Expected: FAIL because `packageJson.bin["the-agent"]` is still `./src/index.ts`, not `./src/main.ts`.

- [ ] **Step 3: Add the minimal implementation**

Create `apps/cli/src/main.ts` with this complete file:

```ts
import { dispatchCliCommand } from "./dispatcher.js";

try {
  const result = await dispatchCliCommand(Bun.argv.slice(2));
  process.stdout.write(result.output);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown CLI error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
```

In `apps/cli/src/index.ts`, delete this import from the top of the file:

```ts
import { dispatchCliCommand } from "./dispatcher.js";
```

In `apps/cli/src/index.ts`, delete this executable block from the bottom of the file:

```ts
if (import.meta.main) {
  try {
    const result = await dispatchCliCommand(Bun.argv.slice(2));
    process.stdout.write(result.output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
```

After the edit, the top of `apps/cli/src/index.ts` must begin with:

```ts
export const cliCommands = [
```

After the edit, the bottom of `apps/cli/src/index.ts` must end with:

```ts
export type { CliDispatchResult } from "./dispatcher.js";
```

Update `apps/cli/package.json` to this complete file:

```json
{
  "name": "@vivarium/cli",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "bin": {
    "the-agent": "./src/main.ts"
  },
  "scripts": {
    "build": "bun ../../scripts/build.ts",
    "test": "bun test src --pass-with-no-tests",
    "typecheck": "tsc --noEmit -p ../../tsconfig.base.json"
  }
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
bun test apps/cli/src/index.test.ts -t "uses a dedicated process entrypoint"
```

Expected: PASS for the dedicated entrypoint boundary test.

- [ ] **Step 5: Run the full CLI public API test file**

Run:

```bash
bun test apps/cli/src/index.test.ts
```

Expected: PASS for both `CLI public API` and `CLI entrypoint boundary`.

- [ ] **Step 6: Smoke test the new direct entrypoint**

Run:

```bash
bun apps/cli/src/main.ts doctor --help
```

Expected: the command prints the same doctor help text that was previously available through `bun apps/cli/src/index.ts doctor --help`, and exits successfully.

- [ ] **Step 7: Commit the implementation**

Run:

```bash
git add apps/cli/package.json apps/cli/src/index.test.ts apps/cli/src/index.ts apps/cli/src/main.ts
git commit -m "fix(cli): split executable entrypoint"
```

Expected: a commit is created with only the CLI entrypoint split files staged. Leave unrelated `.DS_Store` files untracked.

### Task 2: Repository Verification

**Files:**
- Verify: repository checks only

- [ ] **Step 1: Run the normal test suite**

Run:

```bash
bun run test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run:

```bash
bun run lint
```

Expected: exits with no lint errors.

- [ ] **Step 3: Run format check**

Run:

```bash
bun run format:check
```

Expected: exits cleanly with no files requiring formatting.

- [ ] **Step 4: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: exits with no TypeScript errors.

- [ ] **Step 5: Check for whitespace errors**

Run:

```bash
git diff --check
```

Expected: exits cleanly with no whitespace errors.

- [ ] **Step 6: Run build**

Run:

```bash
bun run build
```

Expected: the repository build completes successfully.

- [ ] **Step 7: Run knip**

Run:

```bash
bun run knip
```

Expected: exits with status 0.

- [ ] **Step 8: Record verification status**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing `.DS_Store` files remain untracked after the implementation commit, unless verification commands generated legitimate new artifacts that must be inspected before proceeding.

## Self-Review

- Spec coverage: Task 1 covers `main.ts`, `index.ts`, `package.json`, the dispatcher call, Bun argv slicing, stdout/stderr preservation, and the public import boundary. Task 2 covers the requested full verification gates.
- Placeholder scan: no placeholder markers, deferred implementation, or unnamed tests remain in this plan.
- Type consistency: the test uses `Record<string, string>` for package bins and checks existing file paths relative to `apps/cli/src/index.test.ts`; the implementation imports the already-existing `dispatchCliCommand` symbol from `./dispatcher.js`.
