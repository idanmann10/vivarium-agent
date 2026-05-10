# Plan Context Identity And Runs Design

## Goal

Make the Plan primitive consume the roadmap's full planning context: identity summary and recent run examples, in addition to skills, traces, and anti-patterns.

## Scope

- Add `runs` to `PlanPrimitiveContext`.
- Add `identitySummary` to `PlanPrimitiveRequest`.
- Include identity summary and run titles in the persisted plan text.
- Pass `tools.identity.summary()` from `runGoal` into Plan.
- Preserve `skillsLoaded` and `tracesLoaded` episode fields.

## Non-Goals

- No episode schema change.
- No new run-loaded field in Plan episodes.
- No change to retrieval ranking.

## Testing

Lifecycle tests verify Plan output includes identity and run examples. Orchestrator tests verify `runGoal` passes current identity into the Plan episode.
