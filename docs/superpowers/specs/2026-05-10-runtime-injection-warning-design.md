# Runtime Injection Warning Design

## Goal

Close the remaining `goal.md` §10.2 local runtime gap by scanning provider execution observations for prompt-injection language, logging detected findings as run evidence, and preserving a working-memory warning for the next planning/prediction cycle.

## Scope

- Reuse the existing deterministic `scanToolOutputForPromptInjection` safety scanner instead of adding a second classifier.
- Export the scanner through the tools package public index so runtime code can consume the same safety behavior as the dispatcher.
- Scan `runGoal` execution observations immediately after the observation episode is recorded and before validation.
- When findings exist, append a high-magnitude `surprise` episode using the current prediction as the expected state and the joined warning reasons as the actual state.
- Write a semantic memory fact in the current domain with `Watch for injection: ...` so later memory recall can surface the warning.
- Keep normal run behavior unchanged when no findings are detected.
- Do not block or fail the run solely because suspicious output is detected; this slice surfaces evidence and memory, not policy enforcement.

## Non-Goals

- No LLM-based prompt-injection classifier.
- No new episode kind or schema migration.
- No change to dispatcher warning semantics.
- No automatic re-run of Predict inside this slice; the memory note is persisted for the next prediction context that reads memory.

## Design

The runtime already records plan, prediction, action, observation, validation, reflection, and run-end episodes. This slice inserts one optional hook after observation recording:

1. Call `scanToolOutputForPromptInjection(execution.observation)`.
2. If the scanner returns no findings, continue exactly as today.
3. If findings exist, append a `surprise` episode with the provider prediction, joined warning text, `magnitude: 0.8`, and notes explaining that the warning came from tool/provider output.
4. Write a semantic fact through `request.tools.memory.write` with subject `tool-output prompt injection`, content starting with `Watch for injection:`, and high importance.

CLI run transparency already summarizes high-magnitude surprise episodes, so the existing `summarizeRunEpisodes` path should surface the warning without adding a second summary mechanism.

## Testing

- Runtime test: a custom provider returns injection text from `execute`; the run completes, records a surprise warning, and writes a semantic memory fact in the run domain.
- CLI test: an OpenAI-compatible provider fetch stub returns injection text only for `[execute]` requests; `runCommand` returns the warning in `transparency.highSurprises`.
- Existing no-warning runtime tests must keep the same episode order.
