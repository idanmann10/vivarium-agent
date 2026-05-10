# Attention Self-Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add roadmap attention self-tools and apply focused limits to planning.

**Architecture:** Keep temporary attention state inside each `createSelfTools` instance. Expose status/focus/defocus through `SelfTools.attention`, then have `runGoal` read the active limits when no explicit `attentionLimits` are passed.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Self-Tool Test

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.test.ts`

- [x] **Step 1: Assert default attention status**

Create self-tools and assert `tools.attention.status()` reports default caps, `focused: false`, and usage fields.

- [x] **Step 2: Assert focus and defocus**

Call `tools.attention.focus({ skillsMax: 2, toolsMax: 3, tokensMax: 500 })`, assert focused caps, then call `defocus()` and assert defaults return.

- [x] **Step 3: Verify red**

Run: `bun test packages/tools/src/builtin/self-tools.test.ts`

Expected: FAIL because `tools.attention` is undefined.

### Task 2: Implement Attention Self-Tools

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.ts`

- [x] **Step 1: Add attention types and interface**

Define focus request, limits, usage, and status shapes, then add `focus`, `defocus`, and `status` to `SelfTools`.

- [x] **Step 2: Add local attention state**

Store default limits, current limits, and focused state inside `createSelfTools`.

- [x] **Step 3: Verify self-tool test**

Run: `bun test packages/tools/src/builtin/self-tools.test.ts`

Expected: PASS.

### Task 3: Failing Runtime Focus Test

**Files:**
- Modify: `packages/runtime/src/orchestrator.test.ts`

- [x] **Step 1: Focus skills to one**

Call `harness.tools.attention.focus({ skillsMax: 1 })` before `runGoal`.

- [x] **Step 2: Assert one planned skill**

Read the plan episode and assert `skillsLoaded.length === 1`.

- [x] **Step 3: Verify red**

Run: `bun test packages/runtime/src/orchestrator.test.ts`

Expected: FAIL because `runGoal` still uses default limits.

### Task 4: Apply Focused Limits In Runtime

**Files:**
- Modify: `packages/runtime/src/orchestrator.ts`

- [x] **Step 1: Read active attention status**

Use `request.tools.attention.status().limits` when `request.attentionLimits` is undefined.

- [x] **Step 2: Preserve explicit override**

Keep `request.attentionLimits` higher priority than self-tool focus.

- [x] **Step 3: Verify focused tests**

Run: `bun test packages/runtime/src/orchestrator.test.ts packages/tools/src/builtin/self-tools.test.ts`

Expected: PASS.

### Task 5: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record attention self-tools and focused runtime caps in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(tools): add attention self-tools"`.

## Self-Review

- Spec coverage: focus, defocus, status, runtime effect, and explicit override precedence are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: `SelfTools.attention.status().limits` matches the runtime attention limiter's cap names.
