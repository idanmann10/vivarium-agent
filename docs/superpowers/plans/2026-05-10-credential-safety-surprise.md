# Credential Safety Surprise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit loggable surprise evidence when the dispatcher blocks credential-like tool arguments.

**Architecture:** Keep `createToolDispatcher` storage-agnostic. Add an optional `onSafetySurprise` callback that receives a sanitized surprise payload when embedded credentials are blocked; callers with run context can pass that payload to `SelfTools.episodes.surprise`.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Dispatcher Red Test

**Files:**
- Modify: `packages/tools/src/dispatcher.test.ts`

- [x] **Step 1: Write failing callback test**

Extend the credential-argument blocking coverage or add a new test that passes `onSafetySurprise`, dispatches an `http.request` with `body: "Bearer sk-secret-token"`, and asserts:

- the result is blocked;
- one safety surprise is emitted;
- the surprise prediction is about `http.request`;
- `actual` contains `embedded credential`;
- the payload does not contain `sk-secret-token`.

- [x] **Step 2: Verify red**

Run: `bun test packages/tools/src/dispatcher.test.ts`

Observed: FAIL because blocked credential args did not emit a safety surprise.

### Task 2: Episode Bridge Red Test

**Files:**
- Modify: `packages/tools/src/dispatcher.test.ts`

- [x] **Step 1: Write failing bridge test**

Create an in-memory state repository and self-tools, create a run ID and agent ID, pass `onSafetySurprise` that calls `tools.episodes.surprise`, dispatch credential-like args, and assert `state.listEpisodes(runId)` contains a `surprise` episode with `actual` containing `embedded credential`.

- [x] **Step 2: Verify red**

Run: `bun test packages/tools/src/dispatcher.test.ts`

Observed: FAIL because no safety surprise reached `tools.episodes.surprise`.

### Task 3: Minimal Implementation

**Files:**
- Modify: `packages/tools/src/dispatcher.ts`
- Modify: `packages/tools/src/index.ts`

- [x] **Step 1: Add types**

Add `ToolSafetySurpriseEvent` and optional `onSafetySurprise?: (event: ToolSafetySurpriseEvent) => void` to `ToolDispatcherOptions`.

- [x] **Step 2: Emit callback on credential block**

When `containsEmbeddedCredential(external.args)` is true, create the sanitized event and call `options.onSafetySurprise?.(event)` before emitting the dispatch event and returning the blocked result.

- [x] **Step 3: Verify green**

Run: `bun test packages/tools/src/dispatcher.test.ts`

Observed: PASS, 12 tests, 28 assertions.

### Task 4: Audit, Gates, Commit

**Files:**
- Modify: `docs/superpowers/audits/2026-05-09-v1-completion-audit.md`

- [x] **Step 1: Update audit**

Record that credential-argument blocking now emits loggable surprise evidence and has a self-tools bridge test that writes a real `surprise` episode.

- [x] **Step 2: Run full gates**

Run:

```bash
bun run lint
bun run typecheck
bun run format:check
git diff --check
bun run build
bun run test
```

Expected: all commands exit 0.

Observed: all commands exited 0; `bun run test` reported 207 tests, 0 failures, and 732 assertions.

- [ ] **Step 3: Commit**

Run:

```bash
git add packages/tools/src/dispatcher.ts packages/tools/src/dispatcher.test.ts packages/tools/src/index.ts docs/superpowers/specs/2026-05-10-credential-safety-surprise-design.md docs/superpowers/plans/2026-05-10-credential-safety-surprise.md docs/superpowers/audits/2026-05-09-v1-completion-audit.md
git commit -m "feat(tools): log credential safety surprises"
```

## Self-Review

- Spec coverage: credential blocking, surprise callback, episode bridge, sanitized payload, tests, and non-goals are covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: the new event type is `ToolSafetySurpriseEvent` and the callback is `onSafetySurprise`.
