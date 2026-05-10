# Daemon Dream Scheduler Design

## Goal

Close the local daemon ownership gap by adding a real start/stop Dream scheduler loop to the daemon package, while keeping the existing deterministic `shouldRunDream` helper.

## Scope

- Add `createDreamScheduler` in `apps/daemon/src/scheduler.ts`.
- Let the scheduler own `lastRunAt`, run count, start/stop state, and an interval handle.
- Accept injected `dream`, `getDomainStats`, clock, interval, and timer functions for deterministic tests.
- Export the scheduler API from `apps/daemon/src/index.ts`.

## Non-Goals

- No OS process supervisor integration.
- No persisted scheduler state across daemon restarts.
- No cron parser dependency.
- No live provider or GitHub verification.

## Testing

Scheduler tests cover due-window execution, daily de-duplication, status metadata, recurring interval start, callback execution, and clean stop with injected timers.
