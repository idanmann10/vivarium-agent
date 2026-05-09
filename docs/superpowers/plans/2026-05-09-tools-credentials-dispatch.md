# Tools Credentials Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder tools/credential code with typed local dispatch, encrypted credential storage, and safety-aware HTTP routing.

**Architecture:** Keep credentials, external adapters, and dispatcher responsibilities separate. Credentials persist through a small encrypted file store. External tools are dependency-injected for testability. The dispatcher is the single entry point for builtin handlers and external tools.

**Tech Stack:** Bun, TypeScript, `bun:test`, Node `crypto`, Node `fs`.

---

### Task 1: Credential Store

**Files:**
- Create: `packages/tools/src/credentials/store.ts`
- Create: `packages/tools/src/credentials/store.test.ts`
- Modify: `packages/tools/src/credentials/resolver.ts`
- Modify: `packages/tools/src/index.ts`

- [ ] **Step 1: Write failing credential tests**

Add tests that create a temp encrypted credential file, store an API key, verify the file does not contain the plaintext secret, reopen the store, and read the credential back.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/tools/src/credentials/store.test.ts`

Expected: FAIL because `store.ts` does not exist.

- [ ] **Step 3: Implement store**

Define `CredentialRecord`, `CredentialStore`, `createMemoryCredentialStore`, and `createEncryptedFileCredentialStore`.

### Task 2: External Tool Router

**Files:**
- Modify: `packages/tools/src/external/index.ts`
- Create: `packages/tools/src/external/index.test.ts`

- [ ] **Step 1: Write failing external route tests**

Add tests for HTTP, file read/write/edit, terminal, code, and MCP calls using injected adapters and temp files.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/tools/src/external/index.test.ts`

Expected: FAIL because routing functions are not implemented.

- [ ] **Step 3: Implement external router**

Add request unions, adapter types, allowlisted file adapter, and `dispatchExternalTool`.

### Task 3: Dispatcher Integration

**Files:**
- Modify: `packages/tools/src/dispatcher.ts`
- Create: `packages/tools/src/dispatcher.test.ts`
- Modify: `packages/tools/src/index.ts`

- [ ] **Step 1: Write failing dispatcher tests**

Add tests proving HTTP safety blocks destructive requests, stored bearer credentials become authorization headers, builtin handlers win before external routing, and audit events fire.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/tools/src/dispatcher.test.ts`

Expected: FAIL because `createToolDispatcher` does not exist.

- [ ] **Step 3: Implement dispatcher**

Add `createToolDispatcher` returning structured dispatch results and compatibility `dispatchTool` wrapper.

### Task 4: Verify and Commit

- [ ] **Step 1: Run focused tests**

Run:

```bash
bun test packages/tools/src/credentials/store.test.ts
bun test packages/tools/src/external/index.test.ts
bun test packages/tools/src/dispatcher.test.ts
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

Update roadmap audits and memory copies, then commit with `git commit -m "feat: add tool dispatch and credential store"`.

## Self-Review

- Spec coverage: credential persistence, external routing, safety, credential injection, and audit events are covered.
- Placeholder scan: no TBD/TODO language.
- Type consistency: public names are consistent across tasks.
