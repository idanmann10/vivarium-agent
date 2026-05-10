# Daemon Compose Supervision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Docker Compose supervision path for the daemon.

**Architecture:** Keep daemon runtime behavior in existing server and HTTP transport modules. Make `apps/daemon/src/main.ts` parse environment configuration and start the HTTP server only when executed directly. Add Dockerfile/Compose artifacts that run that entrypoint with restart and healthcheck settings.

**Tech Stack:** TypeScript, Bun test, Docker Compose.

---

### Task 1: Failing Daemon Main Test

**Files:**
- Create: `apps/daemon/src/main.test.ts`

- [x] **Step 1: Add environment parsing tests**

Assert defaults for host, port, and world root. Assert custom env values are parsed. Assert invalid ports throw a clear error.

- [x] **Step 2: Verify red**

Run: `bun test apps/daemon/src/main.test.ts`

Expected: FAIL because `readDaemonMainConfig` is not exported yet.

### Task 2: Implement Executable Main

**Files:**
- Modify: `apps/daemon/src/main.ts`

- [x] **Step 1: Add config parser**

Export `readDaemonMainConfig(env)` with defaults: host `127.0.0.1`, port `8787`, world root `../the-world`.

- [x] **Step 2: Add start helper**

Export `startDaemonMain(env)` that creates the daemon server and starts HTTP transport.

- [x] **Step 3: Add direct execution path**

When `import.meta.main` is true, start the daemon and log the URL.

- [x] **Step 4: Verify focused test**

Run: `bun test apps/daemon/src/main.test.ts`

Expected: PASS.

### Task 3: Add Compose Supervisor Artifacts

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker-compose.yml`
- Create: `docs/guides/deploy-local-compose.md`

- [x] **Step 1: Add Dockerfile**

Use `oven/bun:1.3.11`, install with `bun install --frozen-lockfile`, expose `8787`, and run `bun apps/daemon/src/main.ts`.

- [x] **Step 2: Add Compose file**

Build the daemon, mount `../the-world` read-only at `/world`, set daemon env vars, publish `8787`, add healthcheck, and use `restart: unless-stopped`.

- [x] **Step 3: Add local deployment guide**

Document `docker compose up --build vivarium-daemon` and `/status` verification.

- [ ] **Step 4: Verify Compose config**

Run: `docker compose config`

Expected: command exits 0.

Result in this workspace: BLOCKED. `docker compose config` fails with `docker: unknown command: docker compose`; `docker-compose config` is not installed. The YAML was parsed with Ruby and contains the expected service and restart policy, but Compose CLI execution remains unverified.

### Task 4: Verify, Audit, and Commit

- [x] **Step 1: Run full agent gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record local Compose supervision and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add daemon compose supervision"`.

## Self-Review

- Spec coverage: executable daemon main, Compose supervision, verification, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: environment variable names are used consistently.
