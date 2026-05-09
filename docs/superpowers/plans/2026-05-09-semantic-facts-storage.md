# Semantic Facts Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add semantic facts as a real in-memory and SQLite-persisted state type.

**Architecture:** Extend the repository APIs with `SemanticFactRecord`, add a new forward SQL migration, and keep the storage simple JSON-by-ID to match other local state records.

**Tech Stack:** Bun, TypeScript, `bun:test`, `bun:sqlite`.

---

### Task 1: Repository API

**Files:**
- Modify: `packages/state/src/repository.ts`
- Modify: `packages/state/src/repository.test.ts`

- [ ] **Step 1: Write failing in-memory test**

Verify `upsertSemanticFact` and `listSemanticFacts` store facts by domain and replace existing IDs.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/state/src/repository.test.ts`

- [ ] **Step 3: Implement in-memory methods**

Add `SemanticFactRecord`, `#semanticFacts`, `upsertSemanticFact`, and `listSemanticFacts`.

### Task 2: SQLite Persistence

**Files:**
- Add: `packages/state/src/storage/migrations/0002_semantic_facts.sql`
- Modify: `packages/state/src/storage/migrations.ts`
- Modify: `packages/state/src/storage/migrations.test.ts`
- Modify: `packages/state/src/sqlite-repository.ts`
- Modify: `packages/state/src/sqlite-repository.test.ts`

- [ ] **Step 1: Write failing SQLite and migration tests**

Verify `semantic_facts` exists, versions include `0001_initial` and `0002_semantic_facts`, and semantic facts survive reopen.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
bun test packages/state/src/storage/migrations.test.ts
bun test packages/state/src/sqlite-repository.test.ts
```

- [ ] **Step 3: Implement migration and SQLite methods**

Create the table and add `upsertSemanticFact` / `listSemanticFacts` using JSON storage.

### Task 3: Verify and Commit

- [ ] **Step 1: Run focused state tests**

Run:

```bash
bun test packages/state/src/repository.test.ts packages/state/src/sqlite-repository.test.ts packages/state/src/storage/migrations.test.ts
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

Update memory-backed audits, then commit with `git commit -m "feat: add semantic fact storage"`.

## Self-Review

- Spec coverage: in-memory, SQLite, migration, and tests are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public type is `SemanticFactRecord`.
