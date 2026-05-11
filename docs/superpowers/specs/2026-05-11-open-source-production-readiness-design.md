# Open Source Production Readiness Design

## Context

Vivarium has substantial local implementation and verification, but it is not yet presented like an open-source project that an external user can evaluate quickly. The remaining `goal.md` v1 blockers are real external evidence: live provider credentials, internal API credential smoke, public contribution landing, other-agent pull/use evidence, curation evidence, and a fourteen-day follow-up. Those cannot be completed by repository polish alone.

This slice makes the agent and world repositories open-source and production-ready in the honest sense: organized, navigable, security-aware, release-aware, and explicit about what is locally ready versus what still requires live evidence.

## Design

Use a hybrid readiness posture:

- Public-facing materials say what works locally and how to verify it.
- Security and conduct files set expectations for responsible public collaboration.
- Release notes document how to cut an operator-facing release without confusing it with the incomplete live v1 proof.
- README and package metadata use final names and descriptions instead of placeholder repo names.
- Tests guard the presence and key content of the new readiness files.

The design does not claim full `goal.md` v1 completion. `doctor --live` remains the completion authority for the live loop.

## Agent Repository Changes

Add root project materials:

- `SECURITY.md`: supported status, how to report vulnerabilities, secret-handling rules, and the live evidence boundary.
- `CODE_OF_CONDUCT.md`: concise contributor conduct standard and enforcement contact path.
- `RELEASING.md`: release checklist for local gates, live-readiness status, changesets, Docker/daemon checks, and post-release notes.

Update existing metadata and docs:

- `README.md`: rename the project to Vivarium Agent, add a quick start, production status, verification commands, and live-readiness boundary.
- `CONTRIBUTING.md`: expand the current short note into an open-source contribution path with checks, changesets, security, and world compatibility notes.
- `package.json`: replace the placeholder package name with `vivarium-agent`, add description, license, repository, bugs, homepage, and package manager metadata.

Add tests:

- `scripts/reference-docs.test.ts`: assert root readiness files exist and contain required operator-facing terms.
- `scripts/tooling.test.ts`: assert root package metadata is release-facing and no longer placeholder-shaped.

## World Repository Changes

Add root project materials:

- `SECURITY.md`: world-specific artifact privacy, PII, credential reporting, and regression reporting guidance.
- `CODE_OF_CONDUCT.md`: same concise standard as the agent repo, adjusted for the world commons.
- `RELEASING.md`: publication and maintenance checklist for validation, stats, featured picks, and auto-merge gates.

Update existing metadata and docs:

- `README.md`: rename to Vivarium World, state current public seed status, explain contribution paths, and link security/conduct/release docs.
- `CONTRIBUTING.md`: include contributor artifact expectations, validation commands, trust/auto-merge boundaries, and private-world guidance.
- `package.json`: replace `the-world` with `vivarium-world`, add description, license, repository, bugs, homepage, and package manager metadata.

Add tests:

- `scripts/validate.test.ts` or `scripts/world-ops.test.ts`: assert root readiness docs exist and package metadata is public-facing.

## Error Handling

Docs must avoid implying secrets belong in the repo. They should direct users to ignored local env files, encrypted credential stores, GitHub private vulnerability reporting or private contact, and `doctor --live` for final evidence.

Any production-readiness claim must be scoped:

- “Open-source ready” means public docs, governance, install paths, and local gates are present.
- “V1 complete” means `doctor --live` returns `ok:true` and all live evidence sections are configured.

## Testing

Use test-first changes for the guardrails:

1. Add failing agent doc/metadata tests.
2. Add the agent docs and metadata.
3. Add failing world doc/metadata tests.
4. Add the world docs and metadata.
5. Run focused tests.
6. Run local gates for both repos.
7. Run `doctor --live --env-file live-readiness.local.env` to verify that the live boundary still reports the real blockers instead of being hidden by launch polish.

## Out of Scope

- Completing live provider, internal credential, public contribution, other-agent, curation, or two-week evidence.
- Adding a web UI, marketing site, cloud deployment, desktop app, or package publishing automation.
- Changing runtime behavior, world validation math, auto-merge policy, or safety thresholds.
- Marking `goal.md` v1 complete.
