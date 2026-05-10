# Doctor Next Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured remediation metadata to live-readiness doctor output.

**Architecture:** Keep `checks` unchanged and derive `nextActions` from the same ordered check list. Add a small check-prefix mapper in `apps/cli/src/commands/doctor.ts`; leave offline-local output unchanged.

**Tech Stack:** Bun, TypeScript, `bun:test`.

---

### Task 1: Doctor Red Tests

**Files:**
- Modify: `apps/cli/src/commands/doctor.test.ts`

- [x] **Step 1: Write failing next-action test**

Add a test using `blockedRunner` and missing env that asserts:

- `result.nextActions` exists.
- It contains an action for `agent.name:missing` with `VIVARIUM_AGENT_REPO_NAME`.
- It contains an action for `agent.remote:missing` with a `git remote add origin` command.
- It contains an action for `provider.openrouter:missing` with `OPENROUTER_API_KEY`.
- It contains an action for `github.auth:invalid` with `gh auth status`.

- [x] **Step 2: Verify red**

Run: `bun test apps/cli/src/commands/doctor.test.ts`

Expected: FAIL because live doctor results do not include `nextActions`.

### Task 2: Dispatcher Red Test

**Files:**
- Modify: `apps/cli/src/dispatcher.test.ts`

- [x] **Step 1: Extend doctor dispatcher expectation**

Update the existing `routes status and doctor commands` test to assert the `doctor --live` result includes `nextActions: expect.any(Array)`.

- [x] **Step 2: Verify red**

Run: `bun test apps/cli/src/dispatcher.test.ts`

Expected: FAIL because the dispatched live doctor result lacks `nextActions`.

### Task 3: Implementation

**Files:**
- Modify: `apps/cli/src/commands/doctor.ts`

- [x] **Step 1: Add result types**

Add `DoctorNextAction` and optional `nextActions` to `DoctorResult`.

- [x] **Step 2: Add action mapping**

Add `isPassingCheck` and `nextActionForCheck(check)` helpers. Cover the existing live-readiness check names with concise remediation text, env vars, and commands.

- [x] **Step 3: Return next actions in live mode**

In `liveReadinessDoctor`, compute `ok` with `isPassingCheck` and return `{ ok, checks, nextActions: checks.filter(...).map(nextActionForCheck) }`.

- [x] **Step 4: Verify green**

Run: `bun test apps/cli/src/commands/doctor.test.ts apps/cli/src/dispatcher.test.ts`

Expected: PASS.

### Task 4: Docs, Gates, Commit

**Files:**
- Modify: `docs/guides/live-readiness.md`
- Modify: `docs/superpowers/audits/2026-05-09-v1-completion-audit.md`

- [x] **Step 1: Update docs and audit**

Mention that `doctor --live` now returns `nextActions` for failed checks and record the focused test evidence.

- [x] **Step 2: Run full gates**

Run:

```bash
bun run lint
bun run typecheck
bun run format:check
git diff --check
bun run build
bun run test
```

Expected: all commands exit 0.

- [x] **Step 3: Commit**

Run:

```bash
git add apps/cli/src/commands/doctor.ts apps/cli/src/commands/doctor.test.ts apps/cli/src/dispatcher.test.ts docs/guides/live-readiness.md docs/superpowers/specs/2026-05-10-doctor-next-actions-design.md docs/superpowers/plans/2026-05-10-doctor-next-actions.md docs/superpowers/audits/2026-05-09-v1-completion-audit.md
git commit -m "feat(cli): add doctor next actions"
```

## Self-Review

- Spec coverage: stable checks, live-only actions, env vars, commands, fallback behavior, tests, and non-goals are covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: the new field is `nextActions` and the item type is `DoctorNextAction`.
