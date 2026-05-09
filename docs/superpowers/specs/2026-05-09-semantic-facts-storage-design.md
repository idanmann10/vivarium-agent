# Semantic Facts Storage Design

## Goal

Close the Phase 1 state-schema gap by making semantic facts a real persisted memory type instead of only a name in `storageTables`.

## Scope

- Add a `SemanticFactRecord` repository type.
- Add in-memory repository methods to upsert and list semantic facts.
- Add SQLite repository methods backed by a new forward migration.
- Keep the existing `0001_initial.sql` immutable and add `0002_semantic_facts.sql`.
- Update migration tests to verify both migration versions and the `semantic_facts` table.

## Non-Goals

- No semantic extraction pipeline in this slice.
- No vector search or relevance pruning yet.
- No Dream semantic summarization changes.

## Testing

- In-memory state tests verify semantic facts can be upserted and listed by domain.
- SQLite state tests verify semantic facts persist across repository instances.
- Migration tests verify the `semantic_facts` table exists and migration versions are idempotently recorded.
