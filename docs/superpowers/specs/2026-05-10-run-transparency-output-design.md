# Run Transparency Output Design

## Goal

Expose the runtime's existing planning, prediction, validation, and surprise evidence in CLI run output.

## Scope

- Add a run transparency summary to successful and started `runCommand` results.
- Include the plan text as the concise reasoning artifact.
- Include the latest prediction confidence and expected outcome.
- Include validation score, pass state, and reasons.
- Include the skill and trace IDs consulted by the Plan episode.
- Surface prediction-vs-actual details for surprise episodes with magnitude greater than `0.4`.

## Non-Goals

- No new episode kind.
- No hidden chain-of-thought or provider transcript exposure.
- No automatic surprise calculation.
- No changes to provider prompts.

## Testing

CLI run tests verify that a normal run includes confidence, plan reasoning, validation reasons, and consulted skills. Runtime tests verify high-magnitude surprise episodes are surfaced while low-magnitude surprise episodes are omitted.
