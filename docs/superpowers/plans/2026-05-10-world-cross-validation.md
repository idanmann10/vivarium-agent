# World Cross-Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require cross-validated evidence before a skill can be pushed to the world.

**Architecture:** Keep the rule in `packages/core/src/math/decision-thresholds.ts` so all push callers share one gate. Carry `evidenceRuns` through the world PR helper and serialize them into proposal frontmatter plus the pull-request body.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Cross-Validation Tests

**Files:**
- Modify: `packages/core/src/math/decision-thresholds.test.ts`
- Modify: `packages/world/src/write.test.ts`

- [x] **Step 1: Add core threshold tests**

Assert that `shouldPushToWorld` returns true for two evidence runs from different goals and false for two evidence runs from the same goal.

- [x] **Step 2: Add PR helper tests**

Assert that `proposeSkillPullRequest` refuses otherwise-passing gate evidence when both evidence runs are from the same goal, and assert that accepted proposal files contain both run IDs.

- [x] **Step 3: Verify red**

Run: `bun test packages/core/src/math/decision-thresholds.test.ts packages/world/src/write.test.ts`

Expected: FAIL because `shouldPushToWorld` ignores cross-validation evidence and `proposeSkillPullRequest` does not serialize skill evidence.

### Task 2: Implement Cross-Validation Gate

**Files:**
- Modify: `packages/core/src/math/decision-thresholds.ts`
- Modify: `packages/world/src/push.ts`

- [x] **Step 1: Add evidence types and helper**

Add `PushEvidenceRun` and `hasCrossValidatedEvidence`.

- [x] **Step 2: Update `shouldPushToWorld`**

Require lower-bound, use, coverage, and cross-validated evidence.

- [x] **Step 3: Serialize skill evidence**

Add optional `evidenceRuns` to `proposeSkill`, include `evidence_run_ids_json` frontmatter when present, and pass PR helper evidence through to the proposal.

- [x] **Step 4: Update PR body**

Include a short evidence list with each run ID and goal in the default pull-request body.

### Task 3: Verify and Commit

- [x] **Step 1: Verify focused tests**

Run: `bun test packages/core/src/math/decision-thresholds.test.ts packages/world/src/write.test.ts`

Expected: PASS.

- [x] **Step 2: Run agent gates**

Run lint, typecheck, test, build, and `git diff --check` in `the-agent`.

- [x] **Step 3: Update audit**

Record cross-validation evidence coverage in the active completion audit.

- [x] **Step 4: Commit**

Commit with `git commit -m "feat(world): require cross-validated skill evidence"`.

## Self-Review

- Spec coverage: two evidence run IDs, different goals, push-gate enforcement, proposal serialization, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: `PushEvidenceRun` is the shared evidence shape used by core and world push helpers.
