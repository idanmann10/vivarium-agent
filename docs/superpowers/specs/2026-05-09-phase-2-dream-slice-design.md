# Phase 2 Dream Slice Design

## Context

Phase 2 in `goal.md` introduces Dream: nightly consolidation that reads recent runs, proposes skills and anti-patterns, extracts traces, promotes/prunes local skills, updates identity, marks habits, surfaces confidence miscalibration, runs a compounding eval, anonymizes publishable artifacts, and queues publishable runs locally.

## Approach

Build a deterministic offline Dream slice over the Phase 1 in-memory state:

- Extend state with local skill records, anti-pattern candidates, trace candidates, identity, and queued publishable artifacts.
- Implement `runtime/src/primitives/dream/` as a pure-ish consolidator that reads state and emits a `DreamResult`.
- Apply roadmap math through existing `core/math/decision-thresholds.ts` and `core/math/stages.ts`.
- Implement a lightweight anonymizer that redacts emails, bearer-like tokens, and filesystem home paths.
- Implement a compounding eval that runs the same synthetic task before and after dream and reports whether retrieved local procedural memory increased.
- Keep scheduler logic deterministic: expose the default cron and a `shouldRunDream` helper, without background processes.

## Non-Goals

- No live nightly daemon scheduling.
- No LLM-generated skill bodies.
- No GitHub publication.
- No SQLite persistence.

## Success Criteria

- Dream promotes a candidate with `LB >= 0.5` and uses `>= 3`.
- Dream prunes a weak or stale skill.
- Dream marks a high-use, high-LB top-five skill habitual.
- Dream updates identity summary and per-domain stage.
- Dream surfaces confidence bucket notes.
- Anonymizer redacts sensitive strings before queuing publishable artifacts.
- `tests/e2e-dream.test.ts` passes.
- `bun run lint && bun run typecheck && bun run test && bun run build` pass in `the-agent`.
