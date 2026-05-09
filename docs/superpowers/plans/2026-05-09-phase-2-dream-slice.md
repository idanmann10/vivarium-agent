# Phase 2 Dream Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement deterministic offline Dream consolidation over the Phase 1 local runtime state.

**Architecture:** Extend the in-memory repository with procedural memory and identity fields. Add a Dream primitive that applies existing core math, updates state, and returns an auditable result. Add anonymizer and eval helpers as small package-level modules.

**Tech Stack:** Bun test, TypeScript ESM, pure TypeScript consolidation functions.

---

### Task 1: Extend State for Dream

**Files:**
- Modify: `packages/state/src/repository.ts`
- Modify: `packages/state/src/repository.test.ts`

- [ ] Add failing tests for local skills, identity, and publish queue.
- [ ] Implement repository methods.
- [ ] Verify state tests pass.

### Task 2: Dream Primitive

**Files:**
- Create: `packages/runtime/src/primitives/dream/primitive.ts`
- Create: `packages/runtime/src/primitives/dream/index.ts`
- Create: `packages/runtime/src/primitives/dream/primitive.test.ts`
- Modify: `packages/runtime/src/index.ts`

- [ ] Add failing tests for promotion, pruning, habituation, identity, stage, confidence notes.
- [ ] Implement deterministic Dream consolidation.
- [ ] Verify Dream tests pass.

### Task 3: Anonymizer

**Files:**
- Modify: `packages/tools/src/anonymizer/pipeline.ts`
- Create: `packages/tools/src/anonymizer/pipeline.test.ts`
- Modify: `packages/tools/src/index.ts`

- [ ] Add failing tests for emails, bearer tokens, and home paths.
- [ ] Implement regex anonymizer.
- [ ] Verify anonymizer tests pass.

### Task 4: Compounding Eval

**Files:**
- Modify: `packages/eval/src/compounding.ts`
- Create: `packages/eval/src/compounding.test.ts`

- [ ] Add failing test for improvement signal after Dream.
- [ ] Implement deterministic compounding score.
- [ ] Verify eval tests pass.

### Task 5: E2E Dream

**Files:**
- Create: `tests/e2e-dream.test.ts`

- [ ] Add e2e test using repository + Dream + anonymizer.
- [ ] Verify all gates and commit.
