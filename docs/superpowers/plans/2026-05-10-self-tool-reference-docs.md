# Self-Tool Reference Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update self-tool reference docs and their regression test for the current tool surface.

**Architecture:** Strengthen the existing `scripts/reference-docs.test.ts` gate rather than introducing a new docs scanner. Keep docs in `docs/reference/tools/`.

**Tech Stack:** Markdown, TypeScript, Bun test.

---

### Task 1: Failing Reference Docs Test

**Files:**
- Modify: `scripts/reference-docs.test.ts`

- [x] **Step 1: Add missing groups**

Add `identity` and `attention` to the self-tool docs list.

- [x] **Step 2: Add named method assertions**

Require curriculum docs to include `read(domain)`, `progress(domain)`, and `advance(domain, stepIndex)`. Require identity docs to include `summary()`, `stage(domain)`, and `history(limit?)`. Require attention docs to include `focus(request)`, `defocus()`, and `status()`.

- [x] **Step 3: Verify red**

Run: `bun test scripts/reference-docs.test.ts`

Expected: FAIL because `identity.md` is missing and curriculum/attention pages lack required method names.

### Task 2: Update Reference Pages

**Files:**
- Create: `docs/reference/tools/identity.md`
- Modify: `docs/reference/tools/curriculum.md`
- Modify: `docs/reference/tools/attention.md`

- [x] **Step 1: Add identity docs**

Document identity summary, stage, and history methods.

- [x] **Step 2: Update curriculum docs**

Document curriculum read, progress, and advance methods.

- [x] **Step 3: Update attention docs**

Document attention focus, defocus, and status methods.

- [x] **Step 4: Verify focused test**

Run: `bun test scripts/reference-docs.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run agent gates**

Run lint, typecheck, test, build, format check, and `git diff --check` in `the-agent`.

- [x] **Step 2: Update audit**

Record reference doc coverage in the active completion audit.

- [x] **Step 3: Commit**

Commit with `git commit -m "docs(tools): cover self-tool references"`.

## Self-Review

- Spec coverage: missing group docs and named method docs are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: method names match the implemented `SelfTools` interface.
