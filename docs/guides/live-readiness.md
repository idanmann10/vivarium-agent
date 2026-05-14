---
title: Live Readiness
description: Clear the external blockers required before v1 live verification.
when_to_read: When `doctor --live` reports missing final names, remotes, world subscriptions, credentials, GitHub auth, or Docker Compose.
---

# Live Readiness

Use this guide after the local test suite is green and before claiming v1 is live-verified. The local implementation can run offline, but the roadmap's v1 done criteria still require real provider calls, GitHub writes, cross-install world pulls, and daemon supervision.

Run the readiness check from `the-agent`:

```bash
vivarium doctor --live \
  --env-file live-readiness.local.env \
  --agent-root /Users/idanmann/Vivarium/the-agent \
  --world-root /Users/idanmann/Vivarium/the-world
```

When the repos use the standard sibling layout, `doctor --live` can infer
`../the-world` from the agent repo. Keep passing `--world-root` for nonstandard
layouts, temporary clones, or private fork checks.

A live-ready workspace should report configured agent/world names, configured agent/world remotes, canonical/private world subscription metadata, configured provider environment and profile metadata, successful live provider smokes, configured internal API credential metadata, a successful credential smoke, configured GitHub token environment, valid GitHub auth, a visible Phase 0 RFC Discussion, green latest agent/world GitHub Actions CI runs on `main`, installed Docker, installed Docker Compose, and a complete v1 evidence manifest.
Path-based checks report `:unavailable` when the env var is set but the expected local file has not been created yet.
When the world subscription registry exists, canonical/private world refs also report `:unavailable` if the configured refs are not present in that registry.
For live-readiness mode, the JSON result also includes `nextActions` for every non-passing check. Each action names the failed check, the env vars or command needed to clear it, and the guide section to read before making live changes.

Use `live env-init` to create `live-readiness.local.env` from the tracked
environment skeleton with `0600` permissions before filling values. Then pass it
to `doctor --live` with `--env-file live-readiness.local.env`; that filename is
ignored because filled copies contain provider keys, GitHub tokens, and internal
API metadata.

```bash
vivarium live env-init --path live-readiness.local.env
```

When `--env-file` is used, `doctor --live` reports `liveEnvFile.permissions:insecure` until group and world permissions are removed from the filled file.

The setup commands below use shell variables from that same file. Before running those commands, load the filled file into a trusted local shell:

```bash
source live-readiness.local.env
```

## Current Production Blocker Map

As of the current Mac install, doctor --live reports `31 passing, 22 blocked`
until these operator-owned inputs are real and verified:

| Area | Needed to clear it |
| --- | --- |
| Model providers | Saved Anthropic/OpenRouter profile metadata is configured; real Anthropic/OpenRouter API keys, a private OpenAI-compatible key/base/model/context/profile, and successful provider smoke calls are still required. |
| Internal credential smoke | A local encrypted credential store, master key, internal API credential value, health URL, and a successful `credentials smoke` result. |
| GitHub live checks | The local env has a keychain-backed `GITHUB_TOKEN`, repository IDs, a visible RFC Discussion, and successful latest `main` CI checks for both repos; v1 public contribution evidence is still tracked in the v1 evidence manifest. |
| V1 evidence manifest | Real multi-day goal evidence, provider and credential smoke transcripts, Dream artifacts, public contribution evidence, published canonical-world artifacts, curation stats, and the required two-week follow-up evidence. |
| Non-author PR review | PRs into protected `main` need the configured status checks plus a review from someone other than the PR author; do not lower this gate without an explicit owner decision. |

## Operator Unlock Key Map

The live env file keeps secret, machine-local, and evidence-path values out of
the public installer. Fill the groups in this order when clearing
`doctor --live`:

| Group | Keys | What they unlock |
| --- | --- | --- |
| Provider keys/models | `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `VIVARIUM_OAI_COMPAT_API_KEY`, `VIVARIUM_ANTHROPIC_MODEL`, `VIVARIUM_OPENROUTER_MODEL`, `VIVARIUM_OPENROUTER_BASE_URL`, `VIVARIUM_OAI_COMPAT_BASE_URL`, and context-window vars | Real LLM calls and provider smoke tests. |
| Provider profiles | `VIVARIUM_PROVIDER_PROFILES_PATH`, `VIVARIUM_ANTHROPIC_PROVIDER_PROFILE`, `VIVARIUM_OPENROUTER_PROVIDER_PROFILE`, `VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE` | Saved profile names and paths that let runs reuse the same checked provider setup. |
| Encrypted credentials/internal API | `VIVARIUM_CREDENTIALS_PATH`, `VIVARIUM_CREDENTIALS_MASTER_KEY`, `VIVARIUM_INTERNAL_API_CREDENTIAL_NAME`, `VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE`, `VIVARIUM_INTERNAL_API_HEALTH_URL` | A local encrypted credential store and a health check that proves secret injection works without printing the secret. |
| GitHub/public release | `GITHUB_TOKEN`, `GH_TOKEN`, `VIVARIUM_GITHUB_OWNER`, `VIVARIUM_AGENT_REPO_NAME`, `VIVARIUM_WORLD_REPO_NAME`, `VIVARIUM_GITHUB_REPOSITORY_ID`, `VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID` | GitHub auth, Discussions, PRs, workflow checks, and protected public release evidence. |
| World subscriptions | `VIVARIUM_WORLD_SUBSCRIPTIONS_PATH`, `VIVARIUM_CANONICAL_WORLD_REF`, `VIVARIUM_PRIVATE_WORLD_REF` | Retrieval from the canonical world and private fork, including second-install pull checks. |
| V1 evidence manifest | `VIVARIUM_V1_EVIDENCE_PATH` | The inspectable manifest that links real goals, smokes, Dream artifacts, public contribution evidence, curation stats, and the two-week improvement evidence. |

## Naming Gate

`goal.md` still treats `the-agent` and `the-world` as temporary names. Choose final names before
creating canonical GitHub repositories so local paths, README titles, package metadata, remote URLs,
and public Discussion/PR links do not need a second migration.

Record the decision before adding remotes:

```text
agent repo name: <final-agent-repo>
world repo name: <final-world-repo>
canonical owner: <github-owner-or-org>
private fork owner: <github-owner-or-org>
```

Export the final names for `doctor --live`:

```bash
export VIVARIUM_AGENT_REPO_NAME=<final-agent-repo>
export VIVARIUM_WORLD_REPO_NAME=<final-world-repo>
```

After names are chosen, either keep the local checkout paths as compatibility aliases or rename the
directories and update commands that reference `/Users/idanmann/Vivarium/the-agent` and
`/Users/idanmann/Vivarium/the-world`.

## Git Remotes

Both repos need canonical GitHub remotes before Discussions, PRs, auto-merge, and cross-install pulls can be verified.

```bash
git -C /Users/idanmann/Vivarium/the-agent remote add origin git@github.com:<owner>/<agent-repo>.git
git -C /Users/idanmann/Vivarium/the-world remote add origin git@github.com:<owner>/<world-repo>.git
git -C /Users/idanmann/Vivarium/the-agent remote -v
git -C /Users/idanmann/Vivarium/the-world remote -v
```

Replace `<agent-repo>` and `<world-repo>` with the names chosen in the naming gate.
After `VIVARIUM_GITHUB_OWNER`, `VIVARIUM_AGENT_REPO_NAME`, and `VIVARIUM_WORLD_REPO_NAME` are set,
`doctor --live` reports `agent.remote:mismatch` or `world.remote:mismatch` when a configured remote
does not point at the expected `<owner>/<repo>` target.

## Provider Environment

At least one real model provider key is enough for a first smoke call. The v1 done scenario requires Anthropic,
OpenRouter, and a private OAI-compatible endpoint for a fine-tune.

```bash
export ANTHROPIC_API_KEY=<redacted>
export OPENROUTER_API_KEY=<redacted>
export VIVARIUM_OAI_COMPAT_API_KEY=<redacted>
export VIVARIUM_OAI_COMPAT_BASE_URL=<private-oai-compatible-base-url>
export VIVARIUM_OAI_COMPAT_MODEL=<private-fine-tune-model>
export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW=<private-context-window>
export VIVARIUM_PROVIDER_PROFILES_PATH=/Users/idanmann/.codex/memories/vivarium-provider-profiles.json
export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE=anthropic-main
export VIVARIUM_ANTHROPIC_MODEL=<anthropic-model>
export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW=<anthropic-context-window>
export VIVARIUM_OPENROUTER_PROVIDER_PROFILE=openrouter
export VIVARIUM_OPENROUTER_MODEL=<openrouter-model>
export VIVARIUM_OPENROUTER_BASE_URL=<openrouter-base-url>
export VIVARIUM_OPENROUTER_CONTEXT_WINDOW=<openrouter-context-window>
export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE=private-finetune
```

Keep secrets out of git and shell history where possible.

Create the live provider profile file and encrypted credential store from the filled env file:

```bash
vivarium live setup \
  --env-file live-readiness.local.env \
  --confirm-write
```

Without `--confirm-write`, this command reports what it would write and exits without creating files.
The dry run includes the target provider profile path, credential store path, provider profile names, and credential name so you can verify the env file before any secret-bearing local files are created.
It also checks the internal API health URL required by the later credential smoke, but does not store that URL in the encrypted credential file.
OpenRouter, private OpenAI-compatible, and internal health URLs must be complete `http://` or `https://` URLs.

You can also save profiles individually. `docs/guides/configure-providers.md` shows the full Anthropic, OpenRouter, and private-compatible profile setup required before `doctor --live` is clear:

```bash
vivarium providers configure \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --name "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE" \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model "$VIVARIUM_OPENROUTER_MODEL" \
  --base-url "$VIVARIUM_OPENROUTER_BASE_URL" \
  --capability chat \
  --capability json_mode \
  --context-window "$VIVARIUM_OPENROUTER_CONTEXT_WINDOW" \
  --cost-class medium
```

For OpenAI or Anthropic profiles, use `--kind openai` or `--kind anthropic` and omit `--base-url`.

Then run provider smoke completions through the saved profiles:

```bash
vivarium providers smoke \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --profile "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE"

vivarium providers smoke \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"

vivarium providers smoke \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --profile "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE"
```

The one-off smoke flags still work when you do not need to save the profile:

```bash
vivarium providers smoke \
  --kind openai \
  --api-key-env OPENAI_API_KEY \
  --model <model>
```

For Anthropic, use `--kind anthropic --api-key-env ANTHROPIC_API_KEY`. For OpenAI-compatible providers, include a base URL:

```bash
vivarium providers smoke \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model <model> \
  --base-url <provider-base-url>
```

After smoke succeeds, run a real goal through the same provider path:

```bash
vivarium run \
  --goal "<small real coding goal>" \
  --domain coding \
  --world-root /Users/idanmann/Vivarium/the-world \
  --state-path /tmp/vivarium-live-state.db \
  --provider-profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --provider-profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```

One-off run flags also remain available. Use `--provider-kind openai` or `--provider-kind anthropic` without `--provider-base-url` for first-party providers.

`doctor --live` expects `VIVARIUM_PROVIDER_PROFILES_PATH` to point at the file created by `providers configure`, checks that each `VIVARIUM_*_PROVIDER_PROFILE` value is present in that file, and runs the three saved-profile smoke probes. It reports `provider.anthropicSmoke:ok`, `provider.openrouterSmoke:ok`, and `provider.privateOaiCompatSmoke:ok` only when those provider calls succeed.

## Internal API Credential

After adding an internal API credential, smoke it through the encrypted keychain and HTTP dispatcher:

```bash
vivarium credentials add \
  --path "$VIVARIUM_CREDENTIALS_PATH" \
  --master-key "$VIVARIUM_CREDENTIALS_MASTER_KEY" \
  --kind bearer \
  --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" \
  --purpose "Call internal API" \
  --value "$VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE"

vivarium credentials smoke \
  --path "$VIVARIUM_CREDENTIALS_PATH" \
  --master-key "$VIVARIUM_CREDENTIALS_MASTER_KEY" \
  --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" \
  --url "$VIVARIUM_INTERNAL_API_HEALTH_URL" \
  --method GET
```

The smoke result reports status and a response preview without returning the secret value.

Export the stable credential metadata for `doctor --live`:

```bash
export VIVARIUM_CREDENTIALS_PATH=/Users/idanmann/.codex/memories/vivarium-credentials.enc
export VIVARIUM_CREDENTIALS_MASTER_KEY=<local-master-key>
export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME=INTERNAL_API_TOKEN
export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE=<redacted-internal-api-token>
export VIVARIUM_INTERNAL_API_HEALTH_URL=<internal-health-url>
```

`VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE` is needed to create the encrypted record with `credentials add`, but it does not need to stay exported after the encrypted store exists. `doctor --live` expects `VIVARIUM_CREDENTIALS_PATH` to point at that encrypted file, expects the master key, credential name, and health URL to be exported, and reports `credentials.smoke:ok` only when the encrypted credential can call the configured health URL and receive a 2xx status.

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

Export the stable GitHub target metadata for `doctor --live` and the Discussion command:

```bash
export VIVARIUM_GITHUB_OWNER=<owner>
export VIVARIUM_GITHUB_REPOSITORY_ID=<repository-node-id>
export VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID=<discussion-category-node-id>
```

Then run a read-only GitHub smoke check:

```bash
vivarium github smoke \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN
```

The command reports repository visibility, default branch, Discussions availability, and token permissions when GitHub returns them.

Open the Phase 0 RFC Discussion only after the target repository ID and Discussion category ID are known:

```bash
vivarium github discussion \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN \
  --repository-id <repository-node-id> \
  --category-id <discussion-category-node-id> \
  --title "Phase 0 Bootstrap RFC" \
  --body "$(cat /Users/idanmann/Vivarium/the-world/proposals/0001-phase-0-bootstrap-rfc.md)" \
  --confirm-write
```

Without `--confirm-write`, the command refuses before reading credentials or calling GitHub.

`doctor --live` also checks that GitHub can see the `RFC 0001: Phase 0 Bootstrap` Discussion in the
canonical world repo. If it reports `github.discussion:missing`, create the Discussion or verify the
configured owner/world repo points at the canonical public world.

The live doctor also checks the latest `main` GitHub Actions CI run for both the agent and world repos:

```bash
gh run list --repo "$VIVARIUM_GITHUB_OWNER/$VIVARIUM_AGENT_REPO_NAME" --branch main --workflow CI --limit 1
gh run list --repo "$VIVARIUM_GITHUB_OWNER/$VIVARIUM_WORLD_REPO_NAME" --branch main --workflow CI --limit 1
```

`github.agentCi:ok` and `github.worldCi:ok` require the latest run to be completed with a successful
conclusion. Pending, missing, failed, or unavailable runs remain live-readiness blockers.

After a generated artifact has been committed to a branch, open a contribution PR:

```bash
vivarium github pull-request \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN \
  --title "Add generated artifact" \
  --body "<summary and validation evidence>" \
  --head <branch-or-owner:branch> \
  --base main \
  --confirm-write
```

Without `--confirm-write`, the command refuses before reading credentials or calling GitHub.

After the Discussion or PR is open, inspect workflow runs:

```bash
vivarium github workflow-runs \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN \
  --branch main \
  --limit 10
```

Use this to verify the validator, stats, trust-gate, and archive workflows that are relevant to the live contribution.
The world auto-merge workflow fails closed unless live signal collection provides trust evidence through `WORLD_CONTRIBUTOR_TRUST`, `WORLD_EFFECTIVE_LB`, `WORLD_REGRESSION_VOTES`, and either `WORLD_POSITIVE_VALIDATORS` or `WORLD_VALIDATOR_VOTES_JSON`.
`scripts/compute-signals.ts` exports those values from contribution proposal metadata when `GITHUB_ENV` is available.
Generated skill PR proposals include neutral contributor trust, local effective lower bound, zero regression votes, and empty validator evidence by default.
Verify live validator metadata is populated before expecting `gh pr merge --auto` to run.

## Launch Security Audit

After both repositories are public, run the launch security audit from the agent repo:

```bash
bun run launch:security-audit
```

The audit requires public visibility, Issues, Discussions, auto-merge, delete-branch-on-merge, private vulnerability reporting, Dependabot security updates, secret scanning, push protection, zero open Dependabot/secret/code scanning alerts, and an explicit `main` protection policy. It accepts either branch protection or repository rulesets when GitHub reports them through the API.

Do not change branch protection or repository rulesets until the repository owner approves the exact policy. The recommended baseline is:

- Require pull request reviews before merging.
- Require status checks to pass before merging.
- Block force pushes.
- Block deletions.
- Require linear history.
- Require conversation resolution.

For the agent repo, protect `main` with the always-on checks from the agent workflows:

```bash
gh api --method PUT \
  "repos/$VIVARIUM_GITHUB_OWNER/$VIVARIUM_AGENT_REPO_NAME/branches/main/protection" \
  --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "verify",
      "changeset",
      "Analyze JavaScript and TypeScript",
      "CodeQL"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

For the world repo, protect `main` with the always-on world checks:

```bash
gh api --method PUT \
  "repos/$VIVARIUM_GITHUB_OWNER/$VIVARIUM_WORLD_REPO_NAME/branches/main/protection" \
  --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "verify",
      "Analyze JavaScript and TypeScript",
      "CodeQL"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

Then re-run the audit:

```bash
bun run launch:security-audit
```

## Multi-World Subscriptions

After the canonical world and a private fork are available locally, save both subscriptions and verify that retrieval searches both while preserving source labels:

```bash
export VIVARIUM_WORLD_SUBSCRIPTIONS_PATH=/Users/idanmann/.codex/memories/vivarium-world-subscriptions.json
export VIVARIUM_CANONICAL_WORLD_REF=<canonical-world-remote-url>
export VIVARIUM_PRIVATE_WORLD_REF=<private-world-remote-url>
```

```bash
vivarium world subscribe \
  --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" \
  --world-root /tmp/vivarium-world-canonical \
  --world-label canonical \
  --world-ref "$VIVARIUM_CANONICAL_WORLD_REF" \
  --priority 1

vivarium world subscribe \
  --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" \
  --world-root /tmp/vivarium-world-private \
  --world-label private \
  --world-ref "$VIVARIUM_PRIVATE_WORLD_REF" \
  --priority 0 \
  --auto-push

vivarium world subscriptions \
  --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH"
```

Search through the saved registry:

```bash
vivarium world search \
  --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" \
  --domain coding \
  --query "<artifact title or distinctive phrase>" \
  --limit 3
```

Use the same saved registry for real runs:

```bash
vivarium run \
  --goal "<small real coding goal>" \
  --domain coding \
  --state-path /tmp/vivarium-live-state.db \
  --world-subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" \
  --provider-profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --provider-profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```

For one-off checks without writing the registry, repeated roots still work:

```bash
vivarium world search \
  --world-root /tmp/vivarium-world-private \
  --world-label private \
  --world-root /tmp/vivarium-world-canonical \
  --world-label canonical \
  --domain coding \
  --query "<artifact title or distinctive phrase>" \
  --limit 3
```

Repeated `--world-root` flags are searched in order. Use priority `0` or list the private fork first when team/internal knowledge should have priority over the canonical world.

`doctor --live` expects `VIVARIUM_WORLD_SUBSCRIPTIONS_PATH` to point at the registry file created by `world subscribe`.
It also checks that `VIVARIUM_CANONICAL_WORLD_REF` and `VIVARIUM_PRIVATE_WORLD_REF` are present as saved `world subscribe --world-ref` values in that file.

## Cross-Install World Pull

After a contribution has landed in the canonical world remote, verify that a separate local install can pull the remote and retrieve the accepted artifact:

```bash
vivarium world transmission-smoke \
  --remote "$VIVARIUM_CANONICAL_WORLD_REF" \
  --destination /tmp/vivarium-world-second-install \
  --ref main \
  --domain coding \
  --query "<accepted artifact title or distinctive phrase>" \
  --limit 3
```

The command clones or updates the destination, searches the pulled world, and returns `ok: true` only when the expected artifact is discoverable from the second install.

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
vivarium daemon smoke --status-url http://127.0.0.1:8787/status
```

## V1 Evidence Manifest

`doctor --live` checks setup prerequisites and the live evidence required by `goal.md` before it can report v1 readiness. Keep the evidence manifest outside git if it contains private links, internal run summaries, or customer data:

```bash
export VIVARIUM_V1_EVIDENCE_PATH=/Users/idanmann/.codex/memories/vivarium-v1-evidence.json
vivarium live evidence-init --path "$VIVARIUM_V1_EVIDENCE_PATH"
```

The manifest is a compact index of evidence, not a substitute for the underlying artifacts. Every evidence-bearing string should point to a command transcript, audit file, PR, Discussion, workflow run, run artifact, contributor profile, or other concrete evidence you can inspect. `doctor --live` accepts `http://` and `https://` evidence links as external artifacts. Local evidence references must be paths that exist relative to the manifest file, the agent root, or the world root; bare run IDs or artifact IDs alone are not enough. `worldSubscriptions.canonical` and `worldSubscriptions.privateFork` must be distinct remote-style refs; when `VIVARIUM_CANONICAL_WORLD_REF` and `VIVARIUM_PRIVATE_WORLD_REF` are configured, those manifest refs must match the configured values exactly. `publicContribution.canonicalSkill` and every `twoWeekImprovement.competingSkillReferences` entry must be GitHub blob URLs for canonical-world `SKILL.md` files, and the two-week competing references must include the public skill that landed. When `VIVARIUM_GITHUB_OWNER` and `VIVARIUM_WORLD_REPO_NAME` are configured, `publicContribution.publicSkillPr`, `publicContribution.autoMerge`, `publicContribution.canonicalSkill`, `publishedArtifacts.antiPattern`, `publishedArtifacts.trace`, `publishedArtifacts.run`, `twoWeekImprovement.competingDiscussion`, and `twoWeekImprovement.competingSkillReferences` must target that configured canonical world repository. `publishedArtifacts.antiPattern`, `publishedArtifacts.trace`, and `publishedArtifacts.run` must be GitHub blob URLs for canonical-world `ANTI-PATTERN.md`, `TRACE.md`, and `RUN.md` files. `twoWeekImprovement.competingDiscussion` is stricter than generic evidence references: it must be a `https://github.com/<owner>/<repo>/discussions/<number>` URL for the competing variant Discussion. The same developer's agent must stay identifiable across the loop: `publishedArtifacts.contributorAgent`, `curationStats.agentContributor`, and `twoWeekImprovement.contributorAgent` must match `publicContribution.contributorAgent`; other-agent signal, pull/use, Plan-read, and refinement evidence must still exclude that contributor identity.

```json
{
  "starterPack": {
    "primaryDomain": "coding",
    "skillCount": 20,
    "traceCount": 3,
    "curriculum": "domains/coding/curriculum.md",
    "skillReferences": [
      "domains/coding/skills/starter-1/SKILL.md",
      "domains/coding/skills/starter-2/SKILL.md",
      "domains/coding/skills/starter-3/SKILL.md",
      "domains/coding/skills/starter-4/SKILL.md",
      "domains/coding/skills/starter-5/SKILL.md",
      "domains/coding/skills/starter-6/SKILL.md",
      "domains/coding/skills/starter-7/SKILL.md",
      "domains/coding/skills/starter-8/SKILL.md",
      "domains/coding/skills/starter-9/SKILL.md",
      "domains/coding/skills/starter-10/SKILL.md",
      "domains/coding/skills/starter-11/SKILL.md",
      "domains/coding/skills/starter-12/SKILL.md",
      "domains/coding/skills/starter-13/SKILL.md",
      "domains/coding/skills/starter-14/SKILL.md",
      "domains/coding/skills/starter-15/SKILL.md",
      "domains/coding/skills/starter-16/SKILL.md",
      "domains/coding/skills/starter-17/SKILL.md",
      "domains/coding/skills/starter-18/SKILL.md",
      "domains/coding/skills/starter-19/SKILL.md",
      "domains/coding/skills/starter-20/SKILL.md"
    ],
    "traceReferences": [
      "domains/coding/traces/starter-1/TRACE.md",
      "domains/coding/traces/starter-2/TRACE.md",
      "domains/coding/traces/starter-3/TRACE.md"
    ],
    "firstRunReferences": ["docs/live/starter-run-1.md", "docs/live/starter-run-2.md"]
  },
  "realGoals": [
    { "id": "goal-1", "goal": "Fix a flaky coding test", "domain": "coding", "date": "2026-05-01", "evidence": "docs/live/goal-1.md" },
    { "id": "goal-2", "goal": "Add a coding CLI command", "domain": "coding", "date": "2026-05-02", "evidence": "docs/live/goal-2.md" },
    { "id": "goal-3", "goal": "Refactor a coding module", "domain": "coding", "date": "2026-05-04", "evidence": "docs/live/goal-3.md" },
    { "id": "goal-4", "goal": "Debug a coding integration", "domain": "coding", "date": "2026-05-06", "evidence": "docs/live/goal-4.md" },
    { "id": "goal-5", "goal": "Ship a coding workflow", "domain": "coding", "date": "2026-05-08", "evidence": "docs/live/goal-5.md" }
  ],
  "providerSmokes": {
    "anthropic": "docs/live/provider-anthropic.md",
    "openRouter": "docs/live/provider-openrouter.md",
    "privateOaiCompat": "docs/live/provider-private.md"
  },
  "internalCredentialSmoke": "docs/live/internal-api-smoke.md",
  "worldSubscriptions": {
    "canonical": "git@github.com:owner/world.git",
    "privateFork": "git@github.com:team/world-private.git"
  },
  "behaviorLoop": {
    "antiPatternAvoided": "docs/live/anti-pattern-avoided.md",
    "antiPatternUnfamiliarTerritory": "docs/live/anti-pattern-unfamiliar-territory.md",
    "tracesRead": ["docs/live/trace-a.md", "docs/live/trace-b.md"],
    "traceSimilarWorkflows": "docs/live/trace-similar-workflows.md",
    "monitorFailurePattern": "docs/live/monitor-failure-pattern.md",
    "recoverReplan": "docs/live/recover-replan.md",
    "destructiveHold": "docs/live/destructive-hold.md",
    "destructiveEscalation": "docs/live/destructive-escalation.md",
    "destructiveConfirmation": "docs/live/destructive-confirmation.md",
    "destructiveContinuation": "docs/live/destructive-continuation.md",
    "destructiveEndpoint": {
      "run": "runs/run-live-001/RUN.md",
      "sequence": [
        { "step": "hold", "evidence": "docs/live/destructive-hold.md" },
        { "step": "escalation", "evidence": "docs/live/destructive-escalation.md" },
        { "step": "confirmation", "evidence": "docs/live/destructive-confirmation.md" },
        { "step": "continuation", "evidence": "docs/live/destructive-continuation.md" }
      ]
    },
    "refusal": "docs/live/refusal.md"
  },
  "dreamArtifacts": {
    "skillCandidates": ["docs/live/skill-candidate-a.md", "docs/live/skill-candidate-b.md"],
    "internalSkill": "proposals/skills/coding/internal-example/SKILL.md",
    "internalSkillPrivateFork": "docs/live/internal-skill-private-fork.md",
    "internalSkillCanonicalAbsence": "docs/live/internal-skill-canonical-absence.md",
    "publicSkill": "https://github.com/owner/world/pull/1",
    "antiPattern": "proposals/anti-patterns/coding/example/ANTI-PATTERN.md",
    "trace": "proposals/traces/coding/example/TRACE.md",
    "traceSourceRun": "docs/live/dream-trace-source-run.md",
    "traceAnnotations": "docs/live/dream-trace-annotations.md"
  },
  "publicContribution": {
    "contributorAgent": "live-agent",
    "publicSkillPr": "https://github.com/owner/world/pull/1",
    "mathGate": "docs/live/math-gate.md",
    "contributorTrust": 0.5,
    "autoMerge": "https://github.com/owner/world/actions/runs/1",
    "canonicalSkill": "https://github.com/owner/world/blob/main/domains/coding/skills/example/SKILL.md",
    "positiveSignals": [
      { "agent": "signal-agent-a", "evidence": "docs/live/signal-1.md" },
      { "agent": "signal-agent-b", "evidence": "docs/live/signal-2.md" },
      { "agent": "signal-agent-c", "evidence": "docs/live/signal-3.md" },
      { "agent": "signal-agent-d", "evidence": "docs/live/signal-4.md" },
      { "agent": "signal-agent-e", "evidence": "docs/live/signal-5.md" }
    ],
    "externalPullUses": [
      { "agent": "external-agent-a", "evidence": "docs/live/external-pull-1.md" },
      { "agent": "external-agent-b", "evidence": "docs/live/external-pull-2.md" },
      { "agent": "external-agent-c", "evidence": "docs/live/external-pull-3.md" }
    ]
  },
  "publishedArtifacts": {
    "contributorAgent": "live-agent",
    "antiPattern": "https://github.com/owner/world/blob/main/domains/coding/anti-patterns/example/ANTI-PATTERN.md",
    "trace": "https://github.com/owner/world/blob/main/domains/coding/traces/example/TRACE.md",
    "run": "https://github.com/owner/world/blob/main/runs/run-live-001/RUN.md",
    "tracePlanRead": { "agent": "plan-reader-a", "evidence": "docs/live/trace-plan-read.md" },
    "runPlanRead": { "agent": "plan-reader-b", "evidence": "docs/live/run-plan-read.md" }
  },
  "curationStats": {
    "featuredPick": "featured/current.md",
    "featuredAntiPattern": "domains/coding/anti-patterns/provider-quirk/ANTI-PATTERN.md",
    "agentContributor": "live-agent",
    "featuredContributor": "provider-quirk-author",
    "stats": "STATS.md",
    "top5SkillSharePercent": 30
  },
  "twoWeekImprovement": {
    "contributorAgent": "live-agent",
    "followupDate": "2026-05-22",
    "baselineMetric": 120,
    "followupMetric": 90,
    "improvementPercent": 25,
    "contributorProfile": "contributors/live-agent.json",
    "competingDiscussion": "https://github.com/owner/world/discussions/2",
    "competingSkillReferences": [
      "https://github.com/owner/world/blob/main/domains/coding/skills/example/SKILL.md",
      "https://github.com/owner/world/blob/main/domains/coding/skills/competing-example/SKILL.md"
    ],
    "similarGoalsEvidence": "docs/live/similar-goals.md",
    "refinementEvidence": [
      { "agent": "refinement-agent-a", "evidence": "docs/live/refinement-1.md" },
      { "agent": "refinement-agent-b", "evidence": "docs/live/refinement-2.md" }
    ],
    "contributorProfileSummary": {
      "publicSkills": 1,
      "antiPatterns": 1,
      "traces": 1,
      "publishedRuns": 1,
      "internalSkills": 2,
      "publicTrust": 0.61
    }
  }
}
```

The live doctor checks the manifest for: coding starter pack depth with distinct installed skill and trace references matching the counts, distinct first-run references, five distinct named real coding goals with distinct run evidence spanning at least seven days and no future dates, three distinct provider smoke records, internal credential smoke evidence, distinct remote-style canonical and private subscriptions that match the configured live refs when provided, anti-pattern use before unfamiliar territory, two distinct traces with similar-workflow evidence, Monitor tool-failure/recover behavior evidence, one ordered destructive-endpoint run sequence that holds, escalates, receives confirmation, and continues, refusal evidence, two distinct Dream skill candidates plus distinct internal and public Dream skills including proof the internal skill was pushed to the private fork only and a trace auto-extracted from an instructive run with annotations, contributor agent identity, a GitHub public skill PR URL in the configured canonical world repo, math-gate evidence, a GitHub Actions auto-merge run URL in that same repo, canonical world skill landing evidence in that same repo, contributor trust of at least 0.5 at the public skill gate, five distinct other-agent positive-signal agent/evidence records, three distinct other-agent external pull/use records with inspectable evidence, published anti-pattern/trace/run GitHub blob evidence in the configured canonical world repo, published-artifact contributor agent identity matching the public contribution contributor, distinct other-agent evidence that another agent read the published trace and run during Plan, featured-pick evidence including a different contributor's anti-pattern while the curation agent contributor still matches the public contribution contributor, `STATS.md` evidence with at least 30% of skills from the top five contributors, a non-future follow-up measurement at least fourteen days after the last recorded goal with a lower metric than baseline and positive improvement percent on similar goals, a two-week contributor agent identity matching the public contribution contributor, a competing GitHub Discussion URL in the configured canonical world repo plus two distinct live canonical-world skill variant GitHub URLs including the landed public skill, inspectable evidence that the measured goals were similar, two distinct other-agent refinement agent/evidence records excluding the contributor and showing that other agents used or refined the skill, and contributor-profile summary evidence covering at least one public skill, one anti-pattern, one trace, one published run, two internal-only skills, and public trust of at least 0.61.

## Completion Boundary

Do not claim v1 live verification until a fresh `doctor --live` returns `ok:true`
against the filled local readiness environment and the output includes these
completion statuses:

- `provider.anthropicSmoke:ok`
- `provider.openrouterSmoke:ok`
- `provider.privateOaiCompatSmoke:ok`
- `credentials.smoke:ok`
- `v1.realGoals:configured`
- `v1.providerSmokes:configured`
- `v1.internalCredentialSmoke:configured`
- `v1.publicContribution:configured`
- `v1.publishedArtifacts:configured`
- `v1.curationStats:configured`
- `v1.twoWeekImprovement:configured`

The two-week follow-up must be real elapsed evidence. It must be recorded at least fourteen days after the last real goal
and include similar-goal comparison evidence, a configured-world competing
Discussion, two live canonical-world skill variant references,
contributor-profile evidence, and other-agent refinement evidence that excludes
the contributor.

## Verification Sequence

After the external prerequisites are configured:

1. Re-run `doctor --live` to confirm the setup blockers that remain.
2. Run `live setup --env-file live-readiness.local.env` without `--confirm-write`; fill every missing, copied-template, or invalid value until the dry run reports the exact provider profile path, credential store path, profile names, and credential name it would create.
3. Run `live setup --env-file live-readiness.local.env --confirm-write` to save the provider profile file and encrypted credential store.
4. Run `providers smoke --profile` for the Anthropic, OpenRouter, and private OpenAI-compatible profiles.
5. Run `credentials smoke` for the encrypted internal API credential.
6. Run `run` with `--provider-profiles-path`, `--provider-profile`, and `--world-subscriptions-path` against a small real goal.
7. Run `github smoke` for the canonical world remote.
8. Open the Phase 0 RFC Discussion in the world remote with `github discussion --confirm-write`.
9. Create a live world contribution PR from a generated artifact with `github pull-request --confirm-write`.
10. Verify the world workflows and trust gates on GitHub with `github workflow-runs`.
11. Save canonical and private fork subscriptions with `world subscribe`, then verify retrieval with `world search --subscriptions-path`.
12. Pull the accepted contribution into a second local install with `world transmission-smoke`.
13. Run the Compose daemon and verify `/status` with `daemon smoke`.
14. Initialize `VIVARIUM_V1_EVIDENCE_PATH` with `live evidence-init`, then fill it with the real v1 loop evidence collected during the week-long and two-week follow-up windows.
15. Re-run `doctor --live`; do not claim v1 live verification until all setup and `v1.*` checks report configured, ok, or installed.

Record the resulting command output in `docs/superpowers/audits/2026-05-10-v1-completion-audit-refresh.md`.
