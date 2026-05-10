# Init Newborn Identity Design

## Goal

Make first-run initialization persist the chosen domain's initial identity stage, matching the roadmap's cold-start requirement.

## Scope

- Initialize the current identity record during `runInitCommand`.
- Set the selected primary domain to `newborn`.
- Keep the identity local and deterministic until live naming exists.
- Prove the durable SQLite state contains the identity after init.

## Non-Goals

- No final product or repository naming decisions.
- No live provider, GitHub, or remote configuration changes.
- No Dream-stage scoring changes.

## Testing

The existing init command test opens the generated SQLite state after `runInitCommand` and asserts the current identity has `local-agent`, the chosen domain at `newborn`, and zero completed runs.
