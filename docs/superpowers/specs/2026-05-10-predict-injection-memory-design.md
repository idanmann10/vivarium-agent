# Predict Injection Memory Design

## Goal

Complete the `goal.md` §10.2 requirement that after a prompt-injection output is detected, the agent's next prediction is fired with a `Watch for injection` note in working memory.

## Scope

- Keep the runtime's existing prompt-injection memory fact from `runGoal`.
- Before Predict, recall domain memory facts matching `Watch for injection`.
- Pass those notes into `runPredictPrimitive`.
- Include the notes in the provider's Predict input under a `Working memory:` section.
- Preserve the current Predict input when no matching warning memory exists.

## Non-Goals

- No second Predict episode inside the same run after detection.
- No new memory table or episode field.
- No change to warning detection patterns.
- No broad memory retrieval overhaul for Plan or Execute.

## Design

`runGoal` already writes semantic memory like `Watch for injection: Tool output may contain prompt injection: ...` when an execution observation looks suspicious. The next run with the same `SelfTools` state should call `tools.memory.recall("Watch for injection", 3)` before Predict and pass those facts to `runPredictPrimitive`.

`runPredictPrimitive` gets an optional `workingMemoryNotes` field. When notes are present, it appends:

```text

Working memory:
- Watch for injection: ...
```

to the provider's Predict input. The prediction episode shape stays unchanged: it still records only the provider's prediction text and confidence.

## Testing

- Primitive test: `runPredictPrimitive` includes working-memory notes in the provider's `predict` input when supplied.
- Orchestrator test: one run records an injection warning; a second run sharing the same state sends `Watch for injection` text in its Predict provider input.
- Existing lifecycle and orchestrator tests cover the no-warning path.
