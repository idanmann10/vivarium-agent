---
title: Live Readiness
description: Clear the external blockers required before v1 live verification.
when_to_read: When `doctor --live` reports missing remotes, credentials, GitHub auth, or Docker Compose.
---

# Live Readiness

Use this guide after the local test suite is green and before claiming v1 is live-verified. The local implementation can run offline, but the roadmap's v1 done criteria still require real provider calls, GitHub writes, cross-install world pulls, and daemon supervision.

Run the readiness check from `the-agent`:

```bash
bun apps/cli/src/index.ts doctor --live \
  --agent-root /Users/idanmann/Vivarium/the-agent \
  --world-root /Users/idanmann/Vivarium/the-world
```

A live-ready workspace should report configured agent/world remotes, configured provider and GitHub token environment, valid GitHub auth, installed Docker, and installed Docker Compose.

## Git Remotes

Both repos need canonical GitHub remotes before Discussions, PRs, auto-merge, and cross-install pulls can be verified.

```bash
git -C /Users/idanmann/Vivarium/the-agent remote add origin git@github.com:<owner>/<agent-repo>.git
git -C /Users/idanmann/Vivarium/the-world remote add origin git@github.com:<owner>/<world-repo>.git
git -C /Users/idanmann/Vivarium/the-agent remote -v
git -C /Users/idanmann/Vivarium/the-world remote -v
```

Replace the placeholders with the final repo names. The roadmap still treats `the-agent` and `the-world` as temporary names.

## Provider Environment

At least one real model provider key must be present before live provider calls and provider-backed anonymization can be verified.

```bash
export OPENAI_API_KEY=<redacted>
export ANTHROPIC_API_KEY=<redacted>
export OPENROUTER_API_KEY=<redacted>
```

Only one provider is required for a first live pass. Keep secrets out of git and shell history where possible.

Then run a provider smoke completion:

```bash
bun apps/cli/src/index.ts providers smoke \
  --kind openai \
  --api-key-env OPENAI_API_KEY \
  --model <model>
```

For Anthropic, use `--kind anthropic --api-key-env ANTHROPIC_API_KEY`. For OpenAI-compatible providers, include a base URL:

```bash
bun apps/cli/src/index.ts providers smoke \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model <model> \
  --base-url <provider-base-url>
```

## GitHub Auth

GitHub writes need a valid authenticated CLI session or token environment. Use one of these paths:

```bash
gh auth login -h github.com
gh auth status
```

or:

```bash
export GITHUB_TOKEN=<redacted>
export GH_TOKEN=<redacted>
gh auth status
```

The token must be able to create Discussions, branches, pull requests, issues, and read workflow state for the chosen world remote.

## Docker Compose

Daemon supervision needs either the Docker Compose plugin or the standalone `docker-compose` command.

```bash
docker --version
docker compose version
docker-compose version
```

At least one Compose command must succeed. Then verify the daemon supervisor:

```bash
docker compose -f /Users/idanmann/Vivarium/the-agent/docker-compose.yml config
docker compose -f /Users/idanmann/Vivarium/the-agent/docker-compose.yml up --build vivarium-daemon
curl http://127.0.0.1:8787/status
```

## Verification Sequence

After the external prerequisites are configured:

1. Re-run `doctor --live`.
2. Run `providers smoke` for one configured provider.
3. Open the Phase 0 RFC Discussion in the world remote.
4. Create a live world contribution PR from a generated artifact.
5. Verify the world workflows and trust gates on GitHub.
6. Pull the accepted contribution into a second local install.
7. Run the Compose daemon and verify `/status`.

Record the resulting command output in `docs/superpowers/audits/2026-05-09-v1-completion-audit.md`.
