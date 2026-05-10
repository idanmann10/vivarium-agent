# Provider Anonymizer Design

## Goal

Close the local Phase 2 anonymizer gap by adding an optional provider-backed scrubber while preserving the deterministic regex redactor as the fallback and safety floor.

## Scope

- Add an async anonymizer API that accepts an optional provider.
- Run regex redaction before provider calls so obvious secrets are not sent to the provider.
- Run regex redaction again on provider output so echoed or newly introduced secrets are still scrubbed.
- Return which method produced the result.
- Add `anonymize` as a local provider task kind.

## Non-Goals

- No live provider credential setup.
- No policy taxonomy for sensitivity classes.
- No model-specific prompt templates.

## Testing

Anonymizer tests cover deterministic redaction, provider-backed scrubbing after deterministic redaction, and deterministic fallback when the provider fails.
