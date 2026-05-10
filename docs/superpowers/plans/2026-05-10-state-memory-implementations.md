# State Memory Implementations Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace memory config stubs with repository-backed memory implementations for all five roadmap memory systems.

**Architecture:** Keep `StateRepository` as the storage interface and add only the missing semantic deletion method. Implement small memory factory modules under `packages/state/src/memory/`, then have self-tools use the real deletion path for `memory.forget`.

**Tech Stack:** TypeScript, Bun test, `bun:sqlite`.

---

### Task 1: Failing Memory Tests

**Files:**
- Modify: `packages/state/src/repository.test.ts`
- Modify: `packages/state/src/sqlite-repository.test.ts`
- Create: `packages/state/src/memory/index.test.ts`
- Modify: `packages/tools/src/builtin/self-tools.test.ts`

- [x] **Step 1: Add semantic deletion assertions**

Assert in-memory and SQLite repositories delete existing semantic facts and return `false` for missing fact IDs.

- [x] **Step 2: Add memory module behavior test**

Assert working memory applies caps, episodic memory appends/lists episodes, semantic memory writes/recalls/forgets facts, procedural memory lists/searches/records skill use, and identity memory summarizes current identity.

- [x] **Step 3: Add self-tool forget assertion**

Assert `tools.memory.forget(fact.id)` returns `true` and removes the persisted fact.

- [x] **Step 4: Verify red**

Run: `bun test packages/state/src/repository.test.ts packages/state/src/sqlite-repository.test.ts packages/state/src/memory/index.test.ts packages/tools/src/builtin/self-tools.test.ts`

Expected: FAIL because semantic deletion and memory factories do not exist yet.

### Task 2: Implement Repository Deletion

**Files:**
- Modify: `packages/state/src/repository.ts`
- Modify: `packages/state/src/sqlite-repository.ts`

- [x] **Step 1: Add interface method**

Add `deleteSemanticFact(id: string): boolean` to `StateRepository`.

- [x] **Step 2: Implement in memory repository**

Delete from the semantic fact map and return whether an entry existed.

- [x] **Step 3: Implement SQLite repository**

Check whether the fact exists, delete it from `semantic_facts`, and return whether deletion happened.

### Task 3: Implement Memory Modules

**Files:**
- Modify: `packages/state/src/memory/working.ts`
- Modify: `packages/state/src/memory/episodic.ts`
- Modify: `packages/state/src/memory/semantic.ts`
- Modify: `packages/state/src/memory/procedural.ts`
- Modify: `packages/state/src/memory/identity.ts`
- Modify: `packages/state/src/memory/index.ts`
- Modify: `packages/tools/src/builtin/self-tools.ts`

- [x] **Step 1: Add working memory cap helper**

Export `applyWorkingMemoryBudget` that trims episodes to `maxEpisodesInContext` and rejects token estimates above `maxWorkingTokens`.

- [x] **Step 2: Add repository-backed factories**

Export `createEpisodicMemory`, `createSemanticMemory`, `createProceduralMemory`, and `createIdentityMemory`.

- [x] **Step 3: Wire self-tool forget**

Return `state.deleteSemanticFact(id)` from `memory.forget`.

- [x] **Step 4: Verify focused tests**

Run: `bun test packages/state/src/repository.test.ts packages/state/src/sqlite-repository.test.ts packages/state/src/memory/index.test.ts packages/tools/src/builtin/self-tools.test.ts`

Expected: PASS.

### Task 4: Verify, Audit, and Commit

- [x] **Step 1: Run full agent gates**

Run lint, typecheck, test, and build for `the-agent`.

- [x] **Step 2: Update audits and memory copies**

Record state memory implementations and updated verification evidence.

- [x] **Step 3: Commit**

Commit with `git commit -m "feat: implement state memory modules"`.

## Self-Review

- Spec coverage: all five memory systems, semantic deletion, self-tool forget, and non-goals are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: factory and method names match the implementation tasks.
