# Credential Safety Surprise Design

## Goal

Close the remaining `goal.md` §10.1 argument-scrubbing gap: when external tool arguments contain embedded credentials, the call is rejected and the safety event can be logged as a `surprise` episode.

## Scope

- Keep credential-argument detection and blocking in `createToolDispatcher`.
- Add an optional `onSafetySurprise` callback to `ToolDispatcherOptions`.
- Fire the callback only when embedded credential arguments are blocked.
- Provide a ready-to-log prediction, actual text, magnitude, and notes payload that callers can pass to `SelfTools.episodes.surprise`.
- Preserve existing `onDispatch` audit events and blocked result shape.

## Non-Goals

- No automatic episode write without caller-provided run context.
- No persistence dependency inside the generic dispatcher.
- No secret value echoing in the surprise payload.
- No broad PII scanner beyond the existing credential-like detector.

## Design

The dispatcher already rejects external args when `containsEmbeddedCredential(external.args)` is true. This slice adds a structured surprise event at that point:

```ts
{
  tool: request.name,
  prediction: {
    about: request.name,
    expected: "Tool arguments do not contain embedded credentials",
    confidence: 0.99
  },
  actual: "Tool arguments appear to contain an embedded credential",
  magnitude: 0.9,
  notes: "Credential-like tool arguments were blocked before dispatch."
}
```

Callers that own run context can bridge the event to episodes:

```ts
onSafetySurprise: (event) => tools.episodes.surprise({
  runId,
  agentId,
  predicted: event.prediction,
  actual: event.actual,
  magnitude: event.magnitude,
  notes: event.notes,
})
```

This keeps the dispatcher storage-agnostic while making the safety requirement testable with real episode logging.

## Testing

- Dispatcher test: embedded credential args are blocked and `onSafetySurprise` receives a non-secret surprise payload.
- Self-tools bridge test: the callback writes a real `surprise` episode through `tools.episodes.surprise`.
- Existing dispatcher tests confirm the blocked result and audit event behavior remain stable.
