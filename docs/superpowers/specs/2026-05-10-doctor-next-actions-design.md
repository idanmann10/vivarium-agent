# Doctor Next Actions Design

## Goal

Make the remaining `doctor --live` blockers actionable by returning machine-readable remediation steps alongside the existing check labels.

## Scope

- Keep the current `checks` strings stable.
- Add `nextActions` only for live-readiness doctor output.
- Produce one remediation object for each non-passing check.
- Include the failed check label, a concise action, any relevant environment variables, an optional command, and the live-readiness guide path.
- Leave offline-local doctor output unchanged.

## Non-Goals

- No automatic mutation of env vars, remotes, credentials, or GitHub state.
- No shell script generation with secrets.
- No live network calls beyond the existing Git/GitHub/Docker probes.
- No change to the readiness pass/fail rules.

## Design

`DoctorResult` gains optional `nextActions`. `liveReadinessDoctor` already builds the ordered `checks` array, so it can derive actions from that same array after computing `ok`.

Passing checks are:

- `:configured`
- `:ok`
- `:installed`

Every other check gets a `DoctorNextAction`:

```ts
{
  check: "provider.openrouter:missing",
  action: "Export OPENROUTER_API_KEY and save an OpenRouter provider profile.",
  env: ["OPENROUTER_API_KEY", "VIVARIUM_OPENROUTER_PROVIDER_PROFILE"],
  command: "bun apps/cli/src/index.ts providers configure ...",
  guide: "docs/guides/live-readiness.md#provider-environment"
}
```

Unknown future failures fall back to the guide root with an action to inspect that check.

## Testing

- Unit test: live doctor with missing names, remotes, provider profile metadata, GitHub auth, and Docker Compose returns `nextActions` containing the failed check names and relevant env vars/commands.
- Unit test: offline-local doctor remains exactly unchanged.
- Dispatcher test: `doctor --live` JSON output includes the new `nextActions` field.
