# Open Source Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the agent and world repositories open-source and production-ready in presentation, governance, metadata, and verification while preserving the honest live-v1 completion boundary.

**Architecture:** Add public-readiness root docs to both repos, update package metadata to final project names, and add focused tests that guard the new docs and metadata. Keep all changes documentation/tooling scoped; `doctor --live` remains the live v1 authority.

**Tech Stack:** Bun test runner, TypeScript test files, root Markdown docs, package metadata.

---

## File Structure

- Modify `package.json`: public-facing package metadata for the agent repo.
- Modify `README.md`: open-source entry point for the agent repo.
- Modify `CONTRIBUTING.md`: external contribution workflow for the agent repo.
- Create `SECURITY.md`: security reporting and secret-handling policy for the agent repo.
- Create `CODE_OF_CONDUCT.md`: contributor conduct policy for the agent repo.
- Create `RELEASING.md`: release checklist for the agent repo.
- Modify `scripts/reference-docs.test.ts`: guard agent readiness docs.
- Modify `scripts/tooling.test.ts`: guard agent package metadata.
- Modify `../the-world/package.json`: public-facing package metadata for the world repo.
- Modify `../the-world/README.md`: open-source entry point for the world repo.
- Modify `../the-world/CONTRIBUTING.md`: external contribution workflow for the world repo.
- Create `../the-world/SECURITY.md`: security and artifact privacy policy for the world repo.
- Create `../the-world/CODE_OF_CONDUCT.md`: contributor conduct policy for the world repo.
- Create `../the-world/RELEASING.md`: publication checklist for the world repo.
- Modify `../the-world/scripts/validate.test.ts`: guard world readiness docs and package metadata.

Do not change runtime behavior, CLI output, world validation math, auto-merge policy, provider configuration, credential handling, or evidence-manifest semantics.

### Task 1: Agent Readiness Guardrails

**Files:**
- Modify: `scripts/reference-docs.test.ts`
- Modify: `scripts/tooling.test.ts`

- [x] **Step 1: Write failing tests**

Add an `agentRootDocs` constant to `scripts/reference-docs.test.ts` and a test named `documents open-source production readiness at the repo root`. The test should require `SECURITY.md`, `CODE_OF_CONDUCT.md`, `RELEASING.md`, `README.md`, and `CONTRIBUTING.md` to contain terms such as `Vivarium Agent`, `doctor --live`, `live-readiness.local.env`, `security`, `vulnerability`, `Code of Conduct`, `release`, `changeset`, and `bun run knip`.

Add metadata assertions to `scripts/tooling.test.ts` requiring:

```ts
expect(packageJson.name).toBe("vivarium-agent");
expect(packageJson.private).toBe(true);
expect(packageJson.description).toContain("local-first");
expect(packageJson.license).toBe("MIT");
expect(packageJson.repository?.url).toContain("vivarium-agent");
expect(packageJson.bugs?.url).toContain("vivarium-agent/issues");
```

- [x] **Step 2: Verify tests fail**

Run:

```bash
bun test scripts/reference-docs.test.ts -t "documents open-source production readiness at the repo root"
bun test scripts/tooling.test.ts -t "includes public-facing package metadata"
```

Expected: both fail because the readiness docs and package metadata are not present yet.

### Task 2: Agent Readiness Docs And Metadata

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `RELEASING.md`

- [x] **Step 1: Implement metadata and docs**

Update `package.json` to use `vivarium-agent` and include public-facing metadata while keeping `"private": true`.

Replace the short root README with a production-facing overview that includes:

- what Vivarium Agent is
- current production status
- quick start
- verification commands
- live readiness
- repo layout
- links to `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, and `RELEASING.md`

Expand `CONTRIBUTING.md` to include setup, local gates, changesets, security, docs, and live-boundary guidance.

Add `SECURITY.md`, `CODE_OF_CONDUCT.md`, and `RELEASING.md` with concise operator-facing content.

- [x] **Step 2: Verify agent tests pass**

Run:

```bash
bun test scripts/reference-docs.test.ts -t "documents open-source production readiness at the repo root"
bun test scripts/tooling.test.ts -t "includes public-facing package metadata"
```

Expected: both pass.

### Task 3: World Readiness Guardrails

**Files:**
- Modify: `../the-world/scripts/validate.test.ts`

- [x] **Step 1: Write failing tests**

Add tests requiring:

- `SECURITY.md`, `CODE_OF_CONDUCT.md`, `RELEASING.md`, `README.md`, and `CONTRIBUTING.md` exist and contain `Vivarium World`, `security`, `PII`, `auto-merge`, `STATS.md`, `featured`, and `validate`.
- `package.json` has `name: "vivarium-world"`, `private: true`, `license: "MIT"`, and repository/bugs URLs containing `vivarium-world`.

- [x] **Step 2: Verify tests fail**

Run:

```bash
bun test scripts/validate.test.ts -t "documents open-source production readiness"
```

Expected: FAIL because world readiness docs and metadata are missing.

### Task 4: World Readiness Docs And Metadata

**Files:**
- Modify: `../the-world/package.json`
- Modify: `../the-world/README.md`
- Modify: `../the-world/CONTRIBUTING.md`
- Create: `../the-world/SECURITY.md`
- Create: `../the-world/CODE_OF_CONDUCT.md`
- Create: `../the-world/RELEASING.md`

- [x] **Step 1: Implement metadata and docs**

Update `package.json` to use `vivarium-world` and include public-facing metadata while keeping `"private": true`.

Update README and CONTRIBUTING to describe the world as the open commons for skills, anti-patterns, traces, runs, featured picks, stats, and trust-gated contributions.

Add world-specific security, conduct, and release docs.

- [x] **Step 2: Verify world tests pass**

Run:

```bash
bun test scripts/validate.test.ts -t "documents open-source production readiness"
```

Expected: PASS.

### Task 5: Full Verification And Completion Audit

**Files:**
- Inspect: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `RELEASING.md`
- Inspect: `../the-world/README.md`, `../the-world/CONTRIBUTING.md`, `../the-world/SECURITY.md`, `../the-world/CODE_OF_CONDUCT.md`, `../the-world/RELEASING.md`
- Inspect: `docs/superpowers/audits/2026-05-10-v1-completion-audit-refresh.md`

- [x] **Step 1: Run focused checks**

Run in `the-agent`:

```bash
bun test scripts/reference-docs.test.ts scripts/tooling.test.ts
```

Run in `the-world`:

```bash
bun test scripts/validate.test.ts
```

- [x] **Step 2: Run repo gates**

Run in `the-agent`:

```bash
bun run typecheck
bun run test
bun run lint
bun run format:check
bun run build
bun run knip
```

Run in `the-world`:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

- [x] **Step 3: Verify live boundary remains honest**

Run in `the-agent`:

```bash
bun apps/cli/src/main.ts doctor --live --env-file live-readiness.local.env
```

Expected: `ok:false` until real live provider/internal/public-contribution/two-week evidence exists. The final answer must state that open-source production readiness is improved, while full `goal.md` v1 remains blocked by live evidence.

- [x] **Step 4: Completion audit**

Build a checklist mapping:

- open-source root docs
- production/release docs
- security/conduct docs
- package metadata
- tests guarding the docs and metadata
- full repo gates
- live v1 boundary

Only mark the active thread goal complete if the objective is interpreted as open-source production-readiness polish and all above checks pass. Do not mark the broader `goal.md` v1 complete unless `doctor --live` returns `ok:true`.
