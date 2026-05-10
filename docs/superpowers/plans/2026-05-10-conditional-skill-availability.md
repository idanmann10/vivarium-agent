# Conditional Skill Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter local world skills by conditional tool availability metadata.

**Architecture:** Extend `LocalWorldSearchRequest` with optional available toolsets/tools. Parse simple frontmatter list values in `local-reader.ts` and filter skill artifacts before ranking output is returned.

**Tech Stack:** TypeScript, Bun, `bun:test`.

---

### Task 1: Failing Conditional Availability Test

**Files:**
- Modify: `packages/world/src/local-reader.test.ts`

- [x] **Step 1: Create required and fallback skills**

Create one research skill with `requires_toolsets: [web]` and `requires_tools: [web.search]`, plus one fallback skill with `fallback_for_toolsets: [web]` and `fallback_for_tools: [web.search]`.

- [x] **Step 2: Assert default fallback**

Search without available tools and assert only the fallback skill appears.

- [x] **Step 3: Assert paid-tool selection**

Search with `availableToolsets: ["web"]` and `availableTools: ["web.search"]`, then assert only the required paid-web skill appears.

- [x] **Step 4: Verify red**

Run: `bun test packages/world/src/local-reader.test.ts`

Expected: FAIL because both skills are currently visible.

### Task 2: Implement Availability Filtering

**Files:**
- Modify: `packages/world/src/local-reader.ts`

- [x] **Step 1: Extend search request**

Add optional `availableToolsets` and `availableTools` arrays.

- [x] **Step 2: Parse simple list metadata**

Add a helper that reads `[a, b]` frontmatter list values.

- [x] **Step 3: Filter skill artifacts**

Keep required skills only when all required toolsets/tools are active, and keep fallback skills only when their fallback toolsets/tools are unavailable.

- [x] **Step 4: Verify focused test**

Run: `bun test packages/world/src/local-reader.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record conditional skill availability in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat(world): filter conditional skills"`.

## Self-Review

- Spec coverage: required toolsets, required tools, fallback toolsets, fallback tools, and unchanged non-skill artifacts are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: request fields are optional and do not alter existing callers.
