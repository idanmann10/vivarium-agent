# Compounding Eval Design

## Goal

Make the Phase 2 compounding eval a real synthetic before/after benchmark, not just a single delta helper.

## Scope

- Add a typed benchmark case format to `packages/eval/src/compounding.ts`.
- Aggregate per-case before/after procedural hits and validation scores.
- Return per-case and aggregate improvement evidence.
- Keep `scoreCompoundingImprovement` as the compatibility primitive used by the aggregate evaluator.
- Update the Dream e2e test to prove Dream output feeds the richer evaluator.

## Non-Goals

- No live provider calls.
- No benchmark corpus download.
- No statistical significance testing beyond deterministic aggregate deltas.

## Test Strategy

- Unit-test that multiple cases produce per-case deltas, aggregate scores, and an improved result.
- Unit-test that empty benchmarks are rejected.
- Update `tests/e2e-dream.test.ts` to call the aggregate evaluator with before/after Dream observations.
