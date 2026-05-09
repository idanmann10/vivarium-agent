# Runtime Primitives Attention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement concrete lifecycle primitive modules and attention-limited world context selection.

**Architecture:** Add small primitive modules for Plan, Predict, Execute, Monitor, Recover, Validate, and Reflect. Keep the orchestrator as the sequencer and state writer. Add attention helper logic in `attention.ts` and register all primitive metadata in `registry.ts`.

**Tech Stack:** Bun, TypeScript, `bun:test`, existing runtime/core/provider/world types.

---

### Task 1: Registry Metadata

**Files:**
- Create: `packages/runtime/src/primitives/registry.test.ts`
- Create/Modify: primitive `meta.ts` files
- Modify: `packages/runtime/src/primitives/registry.ts`

- [ ] **Step 1: Write failing registry test**

Verify the registry contains `plan`, `predict`, `execute`, `monitor`, `recover`, `validate`, `reflect`, and `dream`, and that `monitor` has an `every-n-steps` trigger.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/runtime/src/primitives/registry.test.ts`

- [ ] **Step 3: Implement metadata and registry**

Add metadata files and export `primitiveRegistry` plus compatibility `primitiveNames`.

### Task 2: Attention Selection

**Files:**
- Modify: `packages/runtime/src/attention.ts`
- Create: `packages/runtime/src/attention.test.ts`

- [ ] **Step 1: Write failing attention test**

Verify `applyAttentionLimits` caps skills, traces, tools, and episodes.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/runtime/src/attention.test.ts`

- [ ] **Step 3: Implement attention helper**

Return capped arrays without mutating caller inputs.

### Task 3: Lifecycle Primitive Modules

**Files:**
- Create primitive module directories for `plan`, `predict`, `execute`, `monitor`, `recover`, `validate`, `reflect`
- Create: `packages/runtime/src/primitives/lifecycle.test.ts`
- Modify: `packages/runtime/src/orchestrator.ts`
- Modify: `packages/runtime/src/index.ts`

- [ ] **Step 1: Write failing lifecycle primitive test**

Verify each primitive returns the expected episode payload shape using the deterministic local provider.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/runtime/src/primitives/lifecycle.test.ts`

- [ ] **Step 3: Implement primitive functions**

Move provider calls and payload construction into primitive modules.

- [ ] **Step 4: Update orchestrator**

Replace embedded logic with primitive function calls and use `applyAttentionLimits`.

### Task 4: Verify and Commit

- [ ] **Step 1: Run focused runtime tests**

Run:

```bash
bun test packages/runtime/src/primitives/registry.test.ts
bun test packages/runtime/src/attention.test.ts
bun test packages/runtime/src/primitives/lifecycle.test.ts
bun test packages/runtime/src/orchestrator.test.ts
```

- [ ] **Step 2: Run full gates**

Run:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

- [ ] **Step 3: Update audits and commit**

Update memory-backed audits, then commit with `git commit -m "feat: add runtime primitive modules"`.

## Self-Review

- Spec coverage: primitive metadata, lifecycle modules, attention selection, and orchestrator integration are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public names are `primitiveRegistry`, `primitiveNames`, `applyAttentionLimits`, and `run<Primitive>Primitive`.
