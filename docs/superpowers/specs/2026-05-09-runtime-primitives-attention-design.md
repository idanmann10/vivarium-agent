# Runtime Primitives Attention Design

## Goal

Move the Phase 1 run lifecycle out of an embedded orchestrator script and into concrete primitive modules with metadata, while enforcing attention limits on retrieved world context.

## Scope

- Add Plan, Predict, Execute, Monitor, Recover, Validate, and Reflect primitive modules.
- Add metadata for each lifecycle primitive and include Dream metadata in the registry.
- Keep `runGoal` output and existing e2e behavior stable.
- Add attention selection that caps retrieved skills, traces, tools, and recent episodes.
- Have Plan consume attention-limited world context and record selected skill/trace IDs.

## Non-Goals

- No live cross-provider validation routing yet.
- No multi-step execute loop beyond the existing synthetic local run.
- No user-pause recovery UX.
- No Dream rewrite beyond registry metadata.

## Architecture

Each primitive gets `meta.ts`, `primitive.ts`, and `index.ts` under `packages/runtime/src/primitives/<name>/`. Primitive functions are pure or provider-driven helpers that return episode payloads. The orchestrator remains responsible for IDs, timestamps, state writes, and sequencing.

`packages/runtime/src/primitives/registry.ts` imports all primitive metadata and exports a flat `primitiveRegistry`, plus `primitiveNames` for compatibility.

`packages/runtime/src/attention.ts` exports `applyAttentionLimits`, which trims selected skills, traces, tools, and episodes according to configured limits. The orchestrator uses it after world retrieval and before Plan.

## Testing

- Registry tests verify all eight primitive metadata entries exist with expected triggers.
- Primitive tests verify each lifecycle primitive returns the expected payload shape.
- Attention tests verify skills, traces, tools, and episodes are capped.
- Existing run/recover e2e tests must remain green.
