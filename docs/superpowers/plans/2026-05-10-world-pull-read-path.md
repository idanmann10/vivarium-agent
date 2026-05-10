# World Pull Read Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local `world pull` support for cloning and updating read-only world repositories.

**Architecture:** `packages/world/src/pull.ts` owns git command sequencing through an injected runner. The CLI command is a thin wrapper that parses flags and returns structured pull results.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing World Pull Tests

**Files:**
- Create: `packages/world/src/pull.test.ts`
- Modify: `apps/cli/src/commands/world.test.ts`
- Modify: `apps/cli/src/dispatcher.test.ts`

- [x] **Step 1: Add package pull tests**

Add tests proving missing destinations clone, existing git destinations update, and existing non-git destinations throw.

- [x] **Step 2: Add CLI command tests**

Add tests proving `pullWorldCommand` returns pull metadata and `dispatchCliCommand(["world", "pull", ...])` routes required flags.

- [x] **Step 3: Verify red**

Run: `bun test packages/world/src/pull.test.ts apps/cli/src/commands/world.test.ts apps/cli/src/dispatcher.test.ts`

Expected: FAIL because `pullWorld`, `pullWorldCommand`, and dispatcher routing do not exist.

### Task 2: Implement Pull Helper

**Files:**
- Modify: `packages/world/src/pull.ts`
- Modify: `packages/world/src/index.ts`

- [x] **Step 1: Add pull types**

Add `GitCommandRunner`, `PullWorldRequest`, `PullWorldResult`, and `GitCommand`.

- [x] **Step 2: Implement clone path**

If destination does not exist, create its parent, run `git clone <remote> <destination>`, optionally run `git checkout <ref>` in the destination, and return `mode: "cloned"`.

- [x] **Step 3: Implement update path**

If destination contains `.git`, run `git fetch --all --prune`, optionally `git checkout <ref>`, then `git pull --ff-only`, and return `mode: "updated"`.

- [x] **Step 4: Reject non-git destinations**

If destination exists without `.git`, throw `World destination exists but is not a git checkout`.

### Task 3: Implement CLI Routing

**Files:**
- Modify: `apps/cli/src/commands/world.ts`
- Modify: `apps/cli/src/dispatcher.ts`

- [x] **Step 1: Add `pullWorldCommand`**

Accept `remote`, `destination`, optional `ref`, and optional runner for tests; return `pullWorld` output.

- [x] **Step 2: Route `world pull`**

Parse `--remote`, `--destination`, and optional `--ref`; keep existing `world search` behavior intact.

### Task 4: Verify, Audit, and Commit

- [x] **Step 1: Verify focused tests**

Run: `bun test packages/world/src/pull.test.ts apps/cli/src/commands/world.test.ts apps/cli/src/dispatcher.test.ts`

Expected: PASS.

- [x] **Step 2: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 3: Update audits and memory copies**

Record the world pull read-path slice and updated verification evidence.

- [x] **Step 4: Commit**

Commit with `git commit -m "feat: add world pull read path"`.

## Self-Review

- Spec coverage: clone, update, non-git rejection, CLI routing, tests, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: the public helper is `pullWorld`.
