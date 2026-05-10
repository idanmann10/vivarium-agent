# Stale Retrieval Deprioritization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deprioritize stale world skills during local retrieval.

**Architecture:** Keep the behavior inside `packages/world/src/local-reader.ts`, where local artifact scoring already happens. Apply a small stale penalty to skill scores when frontmatter includes `stale: true`.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Retrieval Test

**Files:**
- Modify: `packages/world/src/local-reader.test.ts`

- [x] **Step 1: Add stale ranking fixture**

Create two coding skills in a temp world: `aaa-stale/SKILL.md` with `stale: true` and `zzz-fresh/SKILL.md` without stale metadata. Give both matching deployment text.

- [x] **Step 2: Assert fresh first**

Search for the shared query and assert the first two skill titles are `Fresh Deployment Skill`, then `Stale Deployment Skill`.

- [x] **Step 3: Verify red**

Run: `bun test packages/world/src/local-reader.test.ts`

Expected: FAIL because equal scores currently preserve the stale file first.

### Task 2: Implement Stale Penalty

**Files:**
- Modify: `packages/world/src/local-reader.ts`

- [x] **Step 1: Add `staleSkillPenalty` helper**

Return `-0.5` for skill files with `stale: true`, and `0` otherwise.

- [x] **Step 2: Apply penalty to scores**

Add the penalty to the existing score calculation without changing filter behavior for anti-patterns, traces, or runs.

- [x] **Step 3: Verify focused tests**

Run: `bun test packages/world/src/local-reader.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record stale retrieval deprioritization in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(world): deprioritize stale skills"`.

## Self-Review

- Spec coverage: stale metadata, ranking-only penalty, unchanged non-skill artifacts, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: helper lives in `local-reader.ts`, matching the existing scoring boundary.
