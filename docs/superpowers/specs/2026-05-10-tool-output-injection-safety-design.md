# Tool Output Injection Safety Design

## Goal

Close the local Phase 1 provider/tool-output validation gap by scanning successful external tool outputs for prompt-injection patterns and surfacing warnings through the dispatcher.

## Scope

- Add deterministic prompt-injection pattern scanning in the safety pipeline.
- Scan successful external tool output values before returning dispatcher results.
- Attach warnings to successful dispatch results when suspicious output is detected.
- Emit warning text through the existing dispatch event `reason` field.
- Keep external tool execution semantics unchanged.

## Non-Goals

- No LLM-based injection classifier.
- No automatic blocking of suspicious output.
- No working-memory note injection yet.
- No provider-response schema validation.

## Testing

Safety tests cover direct prompt-injection pattern detection. Dispatcher tests cover warning propagation from `web.read` output and audit-event surfacing.
