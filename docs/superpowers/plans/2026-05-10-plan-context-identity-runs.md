# Plan Context Identity And Runs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Plan primitive inputs with the roadmap by surfacing identity summary and run examples in plan episodes.

**Architecture:** Reuse the existing `AttentionSelection.runs` array and identity self-tool. The primitive keeps its public payload shape stable while enriching the plan text.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Tests

**Files:**
- Modify: `packages/runtime/src/primitives/lifecycle.test.ts`
- Modify: `packages/runtime/src/orchestrator.test.ts`

- [x] **Step 1: Assert primitive context**

Expect `runPlanPrimitive` to include identity summary and run titles in `plan`.

- [x] **Step 2: Assert orchestrator identity wiring**

Seed current identity in state, run a goal, and expect the Plan episode to include that summary.

- [x] **Step 3: Verify red**

Run: `bun test packages/runtime/src/primitives/lifecycle.test.ts packages/runtime/src/orchestrator.test.ts`

Expected: FAIL because Plan ignores identity and runs.

### Task 2: Implement Plan Context

**Files:**
- Modify: `packages/runtime/src/primitives/plan/primitive.ts`
- Modify: `packages/runtime/src/orchestrator.ts`

- [x] **Step 1: Extend request types**

Add `runs` to the context and `identitySummary` to the request.

- [x] **Step 2: Include plan text evidence**

Append identity and loaded context titles, including run titles, to the plan text.

- [x] **Step 3: Wire runGoal**

Pass `request.tools.identity.summary()` into `runPlanPrimitive`.

- [x] **Step 4: Verify focused tests**

Run: `bun test packages/runtime/src/primitives/lifecycle.test.ts packages/runtime/src/orchestrator.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record Plan identity/run context coverage in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(runtime): include identity in planning context"`.
