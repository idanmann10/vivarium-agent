# World Pull Read Path Design

## Goal

Close the local Phase 1 read-only world path gap by adding a testable `world pull` clone/update path.

## Scope

- Replace the placeholder `pull.ts` with an injectable git runner.
- Clone a remote world into a destination when the destination does not exist.
- Update an existing git checkout with `fetch --all --prune`, optional `checkout <ref>`, and `pull --ff-only`.
- Reject existing non-git destination directories.
- Add a CLI `world pull` command that routes to the pull helper.

## Non-Goals

- No live network verification against a real GitHub remote.
- No subscription registry or config file persistence.
- No authentication helper for private remotes.
- No merge conflict resolution.

## Testing

World package tests use a fake git runner to verify clone/update command sequences. CLI tests verify `world pull` argument parsing and dispatcher routing without touching the network.
