---
title: Live Readiness
description: Clear the external blockers required before v1 live verification.
when_to_read: When `doctor --live` reports missing final names, remotes, world subscriptions, credentials, GitHub auth, or Docker Compose.
---

# Live Readiness

Use this guide after the local test suite is green and before claiming v1 is live-verified. The local implementation can run offline, but the roadmap's v1 done criteria still require real provider calls, GitHub writes, cross-install world pulls, and daemon supervision.

Run the readiness check from `the-agent`:

```bash
bun apps/cli/src/index.ts doctor --live \
  --env-file live-readiness.local.env \
  --agent-root /Users/idanmann/Vivarium/the-agent \
  --world-root /Users/idanmann/Vivarium/the-world
```

A live-ready workspace should report configured agent/world names, configured agent/world remotes, canonical/private world subscription metadata, configured provider environment and profile metadata, configured GitHub token environment, valid GitHub auth, installed Docker, installed Docker Compose, and a complete v1 evidence manifest.
Path-based checks report `:unavailable` when the env var is set but the expected local file has not been created yet.
When the world subscription registry exists, canonical/private world refs also report `:unavailable` if the configured refs are not present in that registry.
For live-readiness mode, the JSON result also includes `nextActions` for every non-passing check. Each action names the failed check, the env vars or command needed to clear it, and the guide section to read before making live changes.

Use `docs/live-readiness.env.example` as a copyable environment skeleton. Copy it to `live-readiness.local.env` before filling values, then pass it to `doctor --live` with `--env-file live-readiness.local.env`; that filename is ignored because filled copies contain provider keys, GitHub tokens, and internal API metadata.
The setup commands below use shell variables from that same file. Before running those commands, load the filled file into a trusted local shell:

```bash
source live-readiness.local.env
```

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
export VIVARIUM_PROVIDER_PROFILES_PATH=/tmp/vivarium-provider-profiles.json
export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE=anthropic-main
export VIVARIUM_OPENROUTER_PROVIDER_PROFILE=openrouter
export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE=private-finetune
```

Keep secrets out of git and shell history where possible.

Save the OpenRouter live provider as one profile. `docs/guides/configure-providers.md` shows the full Anthropic, OpenRouter, and private-compatible profile setup required before `doctor --live` is clear:

```bash
bun apps/cli/src/index.ts providers configure \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --name "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE" \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model <model> \
  --base-url <provider-base-url> \
  --capability chat \
  --capability json_mode \
  --context-window <context-window> \
  --cost-class medium
```

For OpenAI or Anthropic profiles, use `--kind openai` or `--kind anthropic` and omit `--base-url`.

Then run a provider smoke completion through the saved profile:

```bash
bun apps/cli/src/index.ts providers smoke \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```

The one-off smoke flags still work when you do not need to save the profile:

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

After smoke succeeds, run a real goal through the same provider path:

```bash
bun apps/cli/src/index.ts run \
  --goal "<small real coding goal>" \
  --domain coding \
  --world-root /Users/idanmann/Vivarium/the-world \
  --state-path /tmp/vivarium-live-state.db \
  --provider-profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --provider-profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```

One-off run flags also remain available. Use `--provider-kind openai` or `--provider-kind anthropic` without `--provider-base-url` for first-party providers.

`doctor --live` expects `VIVARIUM_PROVIDER_PROFILES_PATH` to point at the file created by `providers configure`, and it checks that each `VIVARIUM_*_PROVIDER_PROFILE` value is present in that file.

## Internal API Credential

After adding an internal API credential, smoke it through the encrypted keychain and HTTP dispatcher:

```bash
bun apps/cli/src/index.ts credentials add \
  --path /tmp/vivarium-credentials.enc \
  --master-key <local-master-key> \
  --kind bearer \
  --name INTERNAL_API_TOKEN \
  --purpose "Call internal API" \
  --value <redacted>

bun apps/cli/src/index.ts credentials smoke \
  --path /tmp/vivarium-credentials.enc \
  --master-key <local-master-key> \
  --name INTERNAL_API_TOKEN \
  --url <internal-health-url> \
  --method GET
```

The smoke result reports status and a response preview without returning the secret value.

Export the stable credential metadata for `doctor --live`:

```bash
export VIVARIUM_CREDENTIALS_PATH=/tmp/vivarium-credentials.enc
export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME=INTERNAL_API_TOKEN
export VIVARIUM_INTERNAL_API_HEALTH_URL=<internal-health-url>
```

`doctor --live` expects `VIVARIUM_CREDENTIALS_PATH` to point at the encrypted file created by `credentials add`.

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
bun apps/cli/src/index.ts github smoke \
  --owner <owner> \
  --repo <world-repo> \
  --token-env GITHUB_TOKEN
```

The command reports repository visibility, default branch, Discussions availability, and token permissions when GitHub returns them.

Open the Phase 0 RFC Discussion only after the target repository ID and Discussion category ID are known:

```bash
bun apps/cli/src/index.ts github discussion \
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

After a generated artifact has been committed to a branch, open a contribution PR:

```bash
bun apps/cli/src/index.ts github pull-request \
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
bun apps/cli/src/index.ts github workflow-runs \
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

## Multi-World Subscriptions

After the canonical world and a private fork are available locally, save both subscriptions and verify that retrieval searches both while preserving source labels:

```bash
export VIVARIUM_WORLD_SUBSCRIPTIONS_PATH=/tmp/vivarium-world-subscriptions.json
export VIVARIUM_CANONICAL_WORLD_REF=<canonical-world-remote-url>
export VIVARIUM_PRIVATE_WORLD_REF=<private-world-remote-url>
```

```bash
bun apps/cli/src/index.ts world subscribe \
  --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" \
  --world-root /tmp/vivarium-world-canonical \
  --world-label canonical \
  --world-ref "$VIVARIUM_CANONICAL_WORLD_REF" \
  --priority 1

bun apps/cli/src/index.ts world subscribe \
  --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" \
  --world-root /tmp/vivarium-world-private \
  --world-label private \
  --world-ref "$VIVARIUM_PRIVATE_WORLD_REF" \
  --priority 0 \
  --auto-push

bun apps/cli/src/index.ts world subscriptions \
  --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH"
```

Search through the saved registry:

```bash
bun apps/cli/src/index.ts world search \
  --subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" \
  --domain coding \
  --query "<artifact title or distinctive phrase>" \
  --limit 3
```

Use the same saved registry for real runs:

```bash
bun apps/cli/src/index.ts run \
  --goal "<small real coding goal>" \
  --domain coding \
  --state-path /tmp/vivarium-live-state.db \
  --world-subscriptions-path "$VIVARIUM_WORLD_SUBSCRIPTIONS_PATH" \
  --provider-profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --provider-profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```

For one-off checks without writing the registry, repeated roots still work:

```bash
bun apps/cli/src/index.ts world search \
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
bun apps/cli/src/index.ts world transmission-smoke \
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
bun apps/cli/src/index.ts daemon smoke --status-url http://127.0.0.1:8787/status
```

## V1 Evidence Manifest

`doctor --live` checks setup prerequisites and the live evidence required by `goal.md` before it can report v1 readiness. Keep the evidence manifest outside git if it contains private links, internal run summaries, or customer data:

```bash
export VIVARIUM_V1_EVIDENCE_PATH=/tmp/vivarium-v1-evidence.json
```

The manifest is a compact index of evidence, not a substitute for the underlying artifacts. Every evidence-bearing string should point to a command transcript, audit file, PR, Discussion, workflow run, run artifact, contributor profile, or other concrete evidence you can inspect. `doctor --live` accepts `http://` and `https://` evidence links as external artifacts. Local evidence references must be paths that exist relative to the manifest file, the agent root, or the world root; bare run IDs or artifact IDs alone are not enough. `twoWeekImprovement.competingDiscussion` is stricter than generic evidence references: it must be a `https://github.com/<owner>/<repo>/discussions/<number>` URL for the competing variant Discussion.

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
    "antiPattern": "domains/coding/anti-patterns/example/ANTI-PATTERN.md",
    "trace": "domains/coding/traces/example/TRACE.md",
    "run": "runs/run-live-001/RUN.md",
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
      "domains/coding/skills/example/SKILL.md",
      "domains/coding/skills/competing-example/SKILL.md"
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

The live doctor checks the manifest for: coding starter pack depth with distinct installed skill and trace references matching the counts, distinct first-run references, five distinct named real coding goals with distinct run evidence spanning at least seven days, three distinct provider smoke records, internal credential smoke evidence, distinct remote-style canonical and private subscriptions, anti-pattern use before unfamiliar territory, two distinct traces with similar-workflow evidence, Monitor tool-failure/recover behavior evidence, one ordered destructive-endpoint run sequence that holds, escalates, receives confirmation, and continues, refusal evidence, two distinct Dream skill candidates plus distinct internal and public Dream skills including proof the internal skill was pushed to the private fork only and a trace auto-extracted from an instructive run with annotations, contributor agent identity, a GitHub public skill PR URL, math-gate evidence, a GitHub Actions auto-merge run URL, canonical world skill landing evidence, contributor trust of at least 0.5 at the public skill gate, five distinct other-agent positive-signal agent/evidence records, three distinct other-agent external pull/use records with inspectable evidence, published anti-pattern/trace/run evidence, published-artifact contributor agent identity, distinct other-agent evidence that another agent read the published trace and run during Plan, featured-pick evidence including a different contributor's anti-pattern, `STATS.md` evidence with at least 30% of skills from the top five contributors, a follow-up measurement at least fourteen days after the last recorded goal with a lower metric than baseline and positive improvement percent on similar goals, a two-week contributor agent identity, a competing GitHub Discussion URL plus two distinct live competing skill variant references, inspectable evidence that the measured goals were similar, two distinct other-agent refinement agent/evidence records excluding the contributor and showing that other agents used or refined the skill, and contributor-profile summary evidence covering at least one public skill, one anti-pattern, one trace, one published run, two internal-only skills, and public trust of at least 0.61.

## Verification Sequence

After the external prerequisites are configured:

1. Re-run `doctor --live` to confirm the setup blockers that remain.
2. Save a provider profile with `providers configure`, then run `providers smoke --profile`.
3. Run `run` with `--provider-profiles-path`, `--provider-profile`, and `--world-subscriptions-path` against a small real goal.
4. Add and smoke one internal API credential with `credentials add` and `credentials smoke`.
5. Run `github smoke` for the canonical world remote.
6. Open the Phase 0 RFC Discussion in the world remote with `github discussion --confirm-write`.
7. Create a live world contribution PR from a generated artifact with `github pull-request --confirm-write`.
8. Verify the world workflows and trust gates on GitHub with `github workflow-runs`.
9. Save canonical and private fork subscriptions with `world subscribe`, then verify retrieval with `world search --subscriptions-path`.
10. Pull the accepted contribution into a second local install with `world transmission-smoke`.
11. Run the Compose daemon and verify `/status` with `daemon smoke`.
12. Fill `VIVARIUM_V1_EVIDENCE_PATH` with the real v1 loop evidence collected during the week-long and two-week follow-up windows.
13. Re-run `doctor --live`; do not claim v1 live verification until all setup and `v1.*` checks report configured, ok, or installed.

Record the resulting command output in `docs/superpowers/audits/2026-05-10-v1-completion-audit-refresh.md`.
