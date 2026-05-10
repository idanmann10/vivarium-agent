# CLI App

Short-lived command surface for local runtime operations.

Implemented command groups include:

- `init`, `run`, `status`, and `doctor`
- `credentials add/list/smoke`
- `providers configure/list/smoke`
- `skills list`
- `world search/pull/subscribe/subscriptions/transmission-smoke`
- `github smoke/discussion/pull-request/workflow-runs`
- `daemon smoke`

Commands are routed through `src/dispatcher.ts` so parser behavior is covered independently from command
implementations. Live provider and GitHub commands require the caller to provide real environment-backed
credentials.
