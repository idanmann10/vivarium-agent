# Run Safety Behavior Design

## Goal

Add local run-level safety behavior for two v1 scenarios: genuinely harmful requests are refused, and destructive goals require confirmation before the run proceeds.

## Scope

- Add a small deterministic goal classifier for harmful and destructive wording.
- Refuse harmful goals before Plan/Predict/Execute.
- Escalate unconfirmed destructive goals before execution.
- Continue confirmed destructive goals through the existing run lifecycle.
- Keep existing run/recover behavior stable.

## Non-Goals

- No LLM safety classifier.
- No interactive pause/resume UX.
- No policy taxonomy beyond the existing episode categories.

## Testing

Orchestrator tests cover harmful refusal, unconfirmed destructive escalation, and confirmed destructive continuation.
