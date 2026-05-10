# World Cross-Validation Design

## Goal

Close the local anti-gaming gap from `goal.md` by requiring pushed public skills to carry evidence from at least two different runs tied to at least two different goals.

## Scope

- Extend the world push gate evidence with `evidenceRuns`, each containing a `runId` and `goal`.
- Add a pure `hasCrossValidatedEvidence` helper in the core decision thresholds.
- Make `shouldPushToWorld` require the existing lower-bound, use, and coverage thresholds plus cross-validated evidence.
- Make `proposeSkillPullRequest` write the validated evidence into the local proposal metadata and PR body.

## Non-Goals

- No live run lookup service.
- No cryptographic attestation of run provenance.
- No change to local draft `world.propose` behavior.
- No change to world auto-merge validator math.

## Testing

Core threshold tests verify that two runs from the same goal do not satisfy the push gate, while two runs from different goals do. World write tests verify that a skill PR is not opened without cross-validated evidence and that accepted PR proposals include the evidence run IDs.
