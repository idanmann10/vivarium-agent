# Tool Rate-Limit and Credential Safety Design

## Goal

Close the local Phase 1 pre-action safety gap for rate limits and embedded credential scrubbing in external tool arguments.

## Scope

- Add per-run tool rate-limit configuration to `createToolDispatcher`.
- Track per-tool counts for a dispatcher instance.
- Block external calls after the configured per-run limit.
- Detect credential-like strings embedded in external tool arguments.
- Block embedded credential arguments before adapter dispatch.

## Non-Goals

- No persistent per-day counter.
- No distributed rate-limit state.
- No secret manager lookup changes.
- No broad PII scanner for all argument fields beyond credential-like strings.

## Testing

Dispatcher tests verify per-run rate-limit blocking and credential-argument blocking. Safety pipeline tests verify credential-like argument detection.
