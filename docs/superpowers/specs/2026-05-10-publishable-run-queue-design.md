# Publishable Run Queue Design

## Goal

Close the local Phase 2 publishability gap by having successful runs queue anonymized publishable artifacts when Reflect marks the run publishable.

## Scope

- Let `runGoal` accept optional surprise notes for Reflect.
- Preserve existing non-publishable run behavior when Reflect does not mark the run publishable.
- Mark the completed run record as publishable when Reflect returns `publishable: true`.
- Queue a redacted run artifact through built-in self-tools.
- Expose publishable artifact queue/list helpers from `createSelfTools`.

## Non-Goals

- No GitHub publication.
- No human approval workflow.
- No live provider scrubber call in the orchestrator path.
- No change to Reflect's publishability rule.

## Testing

Runtime tests verify that a run with a reusable surprise queues one redacted publishable artifact and does not leak email or bearer-token text.
