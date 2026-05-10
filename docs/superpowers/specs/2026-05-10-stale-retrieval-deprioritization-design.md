# Stale Retrieval Deprioritization Design

## Goal

Make local world retrieval honor the roadmap rule that stale skills are deprioritized after the world marks them stale.

## Scope

- Detect `stale: true` metadata on skill files.
- Reduce stale skill rank without hiding the skill entirely.
- Keep anti-pattern, trace, and run ranking unchanged.
- Add a regression test that proves a fresh skill outranks a stale skill with the same query match.

## Non-Goals

- No embedding-reranker changes.
- No changes to stale marker workflow rules.
- No cross-world priority changes.

## Testing

Local world reader tests create one stale and one fresh skill with matching query text and assert the fresh skill is returned first.
