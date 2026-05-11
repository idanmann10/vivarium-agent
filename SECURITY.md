# Security Policy

## Supported Status

Vivarium Agent is pre-1.0 and local-first. Security reports are accepted for the current `main` branch and active
release branches. The live v1 evidence loop is not considered complete until `doctor --live` returns `ok:true`.

## Reporting a vulnerability

Report vulnerabilities privately through GitHub security advisories when available, or by opening a minimal issue
that does not include secrets, exploit payloads, private customer data, provider keys, credential values, or local
machine paths.

Include:

- affected command, package, or workflow
- expected behavior
- observed behavior
- impact
- reproduction steps using dummy credentials

## Secret Handling

Do not commit:

- `live-readiness.local.env`
- provider API keys
- internal API credential values
- encrypted credential stores
- raw provider responses containing private data
- generated evidence files with customer data or private infrastructure names

Use `docs/live-readiness.env.example` to create an ignored `live-readiness.local.env`, and use the encrypted
credential store for live credential smoke tests. `doctor --live` is the supported way to verify security-sensitive
setup without leaking values.

## Security-Sensitive Areas

Treat changes in these areas as high risk:

- `packages/tools/src/credentials/`
- `packages/tools/src/safety/`
- `packages/tools/src/anonymizer/`
- `packages/providers/src/`
- `packages/world/src/push.ts`
- `apps/cli/src/commands/doctor.ts`
- `.github/workflows/`

Security-sensitive PRs should include focused tests and the full local gate, including `bun run knip`.
