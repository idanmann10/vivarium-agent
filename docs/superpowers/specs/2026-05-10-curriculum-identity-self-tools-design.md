# Curriculum And Identity Self-Tools Design

## Goal

Implement the roadmap's named curriculum and identity self-tools beyond the already-present curriculum advance and memory summary paths.

## Scope

- Add `curriculum.read(domain)` for local world curriculum files.
- Add `curriculum.progress(domain)` for stored curriculum progress.
- Add `identity.summary()`, `identity.stage(domain)`, and `identity.history(limit)`.
- Keep the tools backed by existing local world files and state repository records.

## Non-Goals

- No new persistent tables.
- No changes to Dream identity generation.
- No interactive curriculum UI.

## Testing

Self-tool tests create a temporary world curriculum, seed identity and run history, then assert the new curriculum and identity methods return the expected local state.
