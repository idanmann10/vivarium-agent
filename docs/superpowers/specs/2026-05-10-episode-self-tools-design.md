# Episode Self-Tools Design

## Goal

Implement the roadmap's named episode self-tools for observations, surprises, and run recall.

## Scope

- Add `episodes.note(request)` for freeform observation episodes.
- Add `episodes.surprise(request)` for prediction-error episodes.
- Add `episodes.recallRun(runId)` for ordered run episode recall.
- Keep existing low-level `append` and `list` methods.
- Update episode reference docs and method coverage tests.

## Non-Goals

- No new episode kind.
- No automatic surprise magnitude calculation.
- No current-run implicit context object.

## Testing

Self-tool tests create a run, record a note and surprise through the named tools, then verify ordered recall. Reference docs tests verify the episode methods are documented.
