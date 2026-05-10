# Provider Anonymizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional provider-backed anonymizer path with deterministic fallback.

**Architecture:** Keep `anonymizeText` as the synchronous regex baseline. Add `anonymizeTextWithProvider`, which redacts before provider submission, calls provider task kind `anonymize`, then redacts provider output again before returning.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Failing Provider Tests

**Files:**
- Modify: `packages/tools/src/anonymizer/pipeline.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for provider-backed anonymization and provider failure fallback.

- [x] **Step 2: Verify red**

Run: `bun test packages/tools/src/anonymizer/pipeline.test.ts`

Expected: FAIL because `anonymizeTextWithProvider` is not exported.

### Task 2: Implement Provider Scrubber

**Files:**
- Modify: `packages/tools/src/anonymizer/pipeline.ts`
- Modify: `packages/tools/src/index.ts`
- Modify: `packages/providers/src/local.ts`

- [x] **Step 1: Add provider result type and function**

Add `ProviderAnonymizationResult` and `anonymizeTextWithProvider`.

- [x] **Step 2: Add provider task kind**

Add `anonymize` to `LocalProviderTaskKind` and return the scrubber input for the deterministic local provider.

- [x] **Step 3: Verify targeted tests**

Run: `bun test packages/tools/src/anonymizer/pipeline.test.ts packages/providers/src/router.test.ts`

Expected: PASS.

### Task 3: Verify and Commit

- [x] **Step 1: Run full gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record the provider-anonymizer slice and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: add provider anonymizer fallback"`.

## Self-Review

- Spec coverage: provider path, pre/post deterministic redaction, fallback, exports, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: provider task kind is `anonymize`; public result type is `ProviderAnonymizationResult`.
