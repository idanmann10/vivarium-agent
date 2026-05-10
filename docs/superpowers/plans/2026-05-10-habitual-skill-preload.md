# Habitual Skill Preload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preload habitual local skills into planning context.

**Architecture:** Add a `skills.habitual(domain)` self-tool method backed by local procedural memory. Merge those results before world retrieval results in `runGoal`, then let the existing attention limiter choose the final planning context.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Orchestrator Test

**Files:**
- Modify: `packages/runtime/src/orchestrator.test.ts`

- [x] **Step 1: Seed a habitual local skill**

Insert a promoted local skill with `habitual: true`, high use counts, and a body that does not match the run goal.

- [x] **Step 2: Assert plan preload**

Run a coding goal with unrelated text and assert the plan contains the habitual skill title.

- [x] **Step 3: Verify red**

Run: `bun test packages/runtime/src/orchestrator.test.ts`

Expected: FAIL because the orchestrator only uses world retrieval results.

### Task 2: Add Habitual Self-Tool

**Files:**
- Modify: `packages/tools/src/builtin/self-tools.ts`

- [x] **Step 1: Extend `SelfTools.skills`**

Add `habitual(domain?: string): readonly LocalWorldSearchResult[]`.

- [x] **Step 2: Return local habitual skills**

Filter local skills to promoted, habitual records matching the optional domain. Sort by descending uses, keep the top five, and map them to skill-shaped search results with infinite score.

### Task 3: Merge Habitual Skills Before Retrieval

**Files:**
- Modify: `packages/runtime/src/orchestrator.ts`

- [x] **Step 1: Add merge helper**

Create a helper that prepends habitual skills and removes retrieved duplicate skill IDs.

- [x] **Step 2: Use merged context**

Call `request.tools.skills.habitual(request.domain)` before `request.tools.world.search(...)` and pass the merged result into `applyAttentionLimits`.

- [x] **Step 3: Verify focused tests**

Run: `bun test packages/runtime/src/orchestrator.test.ts`

Expected: PASS.

### Task 4: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record habitual skill preload in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(runtime): preload habitual skills"`.

## Self-Review

- Spec coverage: local habitual exposure, retrieval bypass, deduplication, and attention reuse are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: the self-tool returns the same result shape already consumed by runtime attention.
