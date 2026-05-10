# Computer-Use Confirmation Safety Design

## Goal

Close the local Phase 1 safety gap for `computer.click` and `computer.type` confirmation on system-level UI targets.

## Scope

- Add typed computer-use external requests for screenshot, click, type, scroll, list windows, and focus window.
- Route computer-use calls through an injected adapter; no concrete Peekaboo or E2B backend is bundled in this slice.
- Add dispatcher-level confirmation safety for `computer.click` and `computer.type`.
- Treat `systemLevel: true` and `passwordField: true` as confirmation-requiring target metadata.
- Support confirmation levels `always`, `system_only`, and `never`, defaulting to `system_only`.
- Require `confirmed: true` before dispatching guarded click/type calls.

## Non-Goals

- No live macOS UI inspection.
- No Peekaboo or E2B adapter implementation.
- No automatic password-field detection.
- No new CLI commands for enabling computer use.

## Testing

External tool tests verify computer-use adapter routing. Dispatcher tests verify unconfirmed system-level click/type calls are blocked, confirmed calls dispatch, and the default policy guards system-level targets.
