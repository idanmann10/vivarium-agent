# Recover Escalation Default Design

## Goal

Make the Recover primitive escalate to the user when no viable recovery path is available.

## Scope

- Add an explicit `canRecover` flag to `RecoverPrimitiveRequest`.
- Preserve current behavior when `canRecover` is omitted or `true`.
- Return `decision: "escalate"` when `canRecover` is `false`.
- Keep the recovery reason provider-backed so the user receives a clear stuck message.

## Non-Goals

- No multi-step execution loop.
- No automatic path-search algorithm.
- No episode schema change.

## Testing

Lifecycle primitive tests verify that forced/off-track recovery still replans when recovery is possible, and escalates when `canRecover` is false.
