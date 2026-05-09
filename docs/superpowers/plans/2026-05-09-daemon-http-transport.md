# Daemon HTTP Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local HTTP transport and lifecycle wrapper for the daemon server.

**Architecture:** Keep the existing in-process `DaemonServer` as the runtime boundary and add `http-transport.ts` for routing, validation, response formatting, and Bun server start/stop. Export the transport API from the daemon package without changing orchestrator behavior.

**Tech Stack:** Bun, TypeScript, `bun:test`, existing daemon/runtime packages.

---

### Task 1: HTTP Fetch Handler

**Files:**
- Create: `apps/daemon/src/http-transport.ts`
- Test: `apps/daemon/src/http-transport.test.ts`
- Modify: `apps/daemon/src/index.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
import { describe, expect, test } from "bun:test";

import { createDaemonServer } from "./server.js";
import { createDaemonFetchHandler } from "./http-transport.js";

describe("createDaemonFetchHandler", () => {
  test("routes status, run, and dream requests to the daemon", async () => {
    const fetch = createDaemonFetchHandler(createDaemonServer({ worldRoot: "../the-world" }));

    expect(await json(fetch(new Request("http://daemon/status")))).toMatchObject({ status: "running", runs: 0 });

    const run = await json(
      fetch(
        new Request("http://daemon/run", {
          method: "POST",
          body: JSON.stringify({ goal: "write a transport test", domain: "coding" }),
        }),
      ),
    );
    expect(run.success).toBe(true);

    const dream = await json(
      fetch(
        new Request("http://daemon/dream", {
          method: "POST",
          body: JSON.stringify({ coding: { runsCompleted: 4, successRate: 1, skillDiversity: 2 } }),
        }),
      ),
    );
    expect(dream.identitySummary).toContain("coding");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/daemon/src/http-transport.test.ts`

Expected: FAIL because `./http-transport.js` does not exist.

- [ ] **Step 3: Implement minimal handler**

Create `createDaemonFetchHandler(daemon)` with JSON responses for `GET /status`, `POST /run`, and `POST /dream`.

- [ ] **Step 4: Add validation tests**

Add tests for invalid JSON, invalid run payloads, unknown paths, and unsupported methods.

- [ ] **Step 5: Implement validation and export API**

Return stable `{ error: string }` JSON responses with status codes 400, 404, and 405. Export `createDaemonFetchHandler` from `apps/daemon/src/index.ts`.

### Task 2: Bun Server Lifecycle

**Files:**
- Modify: `apps/daemon/src/http-transport.ts`
- Test: `apps/daemon/src/http-transport.test.ts`
- Modify: `apps/daemon/src/index.ts`

- [ ] **Step 1: Write failing lifecycle test**

```ts
test("starts and stops a Bun HTTP daemon server", async () => {
  const port = await findAvailablePort();
  const server = startDaemonHttpServer({
    daemon: createDaemonServer({ worldRoot: "../the-world" }),
    hostname: "127.0.0.1",
    port,
  });

  const response = await fetch(`${server.url}/status`);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ status: "running" });
  server.stop();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/daemon/src/http-transport.test.ts`

Expected: FAIL because `startDaemonHttpServer` is not defined.

- [ ] **Step 3: Implement lifecycle wrapper**

Add `startDaemonHttpServer({ daemon, hostname, port })` returning `{ url, stop }`, backed by `Bun.serve`. Because Bun 1.3.11 rejects `port: 0` in this environment, tests should pass a preallocated loopback port.

- [ ] **Step 4: Verify focused tests**

Run: `bun test apps/daemon/src/http-transport.test.ts`

Expected: all transport tests pass.

- [ ] **Step 5: Verify repository gates and commit**

Run:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Expected: all commands pass. Commit with `git commit -m "feat: add daemon http transport"`.

## Self-Review

- Spec coverage: route handling, validation, lifecycle, and exports are covered.
- Placeholder scan: no placeholders remain.
- Type consistency: public names are `createDaemonFetchHandler` and `startDaemonHttpServer` throughout.
