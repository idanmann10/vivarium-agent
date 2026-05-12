# Releasing Vivarium Agent

Vivarium Agent releases are operator-facing checkpoints for the local runtime. A release can be production-ready
for local use without claiming the full `goal.md` v1 cultural-transmission loop is complete.

## Release Checklist

1. Confirm the working tree is clean except for the intended release changes.
2. Run the full local gate:

   ```bash
   bun run lint
   bun run knip
   bun run public-release:scan
   bun run typecheck
   bun run test
   bun run build
   bun run format:check
   ```

3. Confirm changesets are present for package, CLI, or operator-facing changes:

   ```bash
   bunx changeset status
   ```

4. Run the live-readiness doctor with an ignored local environment file:

   ```bash
   bun apps/cli/src/main.ts doctor --live --env-file live-readiness.local.env
   ```

5. Record the live-readiness result honestly in release notes. If `doctor --live` returns `ok:false`, list the
   remaining blockers instead of calling `goal.md` v1 complete.
6. Smoke the daemon when daemon behavior changed:

   ```bash
   bun apps/cli/src/main.ts daemon smoke --status-url http://127.0.0.1:8787/status
   ```

7. Verify public docs still point to `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `RELEASING.md`,
   and `LICENSE`.
8. Before calling a release open-source, confirm the GitHub repo is a public GitHub repository and the release PR
   is no longer a draft. If the repository is still private, label the release as a private preview.
9. After the repository is public, verify the GitHub security posture before announcing the launch:
   - run `bun run launch:security-audit`
   - private vulnerability reporting is enabled
   - secret scanning is enabled
   - push protection is enabled
   - CodeQL has run on the public repository and code scanning alerts have been reviewed
10. Record an explicit owner decision for `main` branch protection or repository rulesets. Do not enable or change
    branch protection or repository rulesets without explicit approval for that repository.

## Release Notes

Release notes should include:

- user-visible CLI, daemon, runtime, provider, world, or documentation changes
- migration notes for state, config, credentials, or world subscriptions
- exact verification commands run
- `doctor --live` status
- known live-evidence blockers, if any

Do not include secrets, private evidence content, provider responses, internal URLs, or raw credential smoke output.
