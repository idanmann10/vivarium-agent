# Habitual Skill Preload Design

## Goal

Make habitual local skills actually participate in planning without depending on query retrieval.

## Scope

- Expose promoted habitual local skills through self-tools.
- Load habitual skills for the run domain before retrieval-selected world skills.
- Deduplicate retrieved skills with the same ID after habitual preload.
- Preserve the existing attention budget boundary.

## Non-Goals

- No change to Dream's habituation threshold math.
- No change to world retrieval ranking.
- No new user-facing CLI flags.

## Testing

An orchestrator regression test writes a promoted habitual local skill whose text does not match the goal. The run plan must still include that habitual skill, proving it was preloaded rather than retrieved by query.
