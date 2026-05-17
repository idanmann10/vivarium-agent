---
title: Install
description: How to install the local agent.
when_to_read: When setting up a development or user install.
---

# Install

For the default user install, run the one-line bootstrap script:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | bash
```

The installer checks for `git` and `bun`, clones or updates the agent checkout,
clones or updates the canonical world beside it, installs dependencies, and then
runs the guided `vivarium local` command. It also writes a `vivarium` command to
`~/.local/bin` so future commands can run from any directory. Most users do not
need to set environment variables before the first run. The installer infers
public repo metadata, creates a named `local-agent` with state under
`~/.vivarium`, and prints the next agent commands.

On macOS, install and start the local daemon as a LaunchAgent in the same pass:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh | VIVARIUM_DAEMON=launchd bash
```

The LaunchAgent mode writes
`~/Library/LaunchAgents/com.vivarium.agent.daemon.plist`, starts it with
`launchctl`, and prints a daemon smoke command for
`http://127.0.0.1:8787/status`. Override the label with
`VIVARIUM_DAEMON_LABEL`, the bind host with `VIVARIUM_DAEMON_HOST`, the port
with `VIVARIUM_DAEMON_PORT`, or the Bun executable with `VIVARIUM_BUN_PATH`.
Interactive terminals use the branded ANSI theme automatically. Set
`VIVARIUM_COLOR=always` to force it, `VIVARIUM_COLOR=never` or `NO_COLOR` to
disable it, or `FORCE_COLOR=1` when a wrapper strips TTY detection. Set
`VIVARIUM_THEME=matrix` or `VIVARIUM_THEME=amber` for alternate ASCII-art
palettes.

## Pre-main Mac install

Before a branch, tag, or release commit is available on `main`, fetch a
verified installer script by commit or tag and pass the desired checkout ref
into the install step:

```bash
curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/<installer-commit-or-tag>/scripts/install.sh | \
  VIVARIUM_AGENT_REF=<branch-or-tag-or-commit> \
  VIVARIUM_DAEMON=launchd \
  bash
```

This keeps the downloaded installer stable while the installed checkout follows
the explicit ref you selected. The default Mac layout is:

From an installed or source checkout that is already on a pre-main branch, run
`vivarium launch handoff` to print the same branch-pinned install command with
the installer script pinned to the current commit. Pass
`vivarium launch handoff --ref main` when you want the stable public install
command instead.

- Agent checkout: `~/.vivarium/vivarium-agent`
- Canonical world checkout: `~/.vivarium/the-world`
- CLI command: `~/.local/bin/vivarium`
- LaunchAgent: `~/Library/LaunchAgents/com.vivarium.agent.daemon.plist`
- Local live-readiness env file: `~/.vivarium/live/live-readiness.local.env`

After a pre-main install, verify both the daemon and a local run:

```bash
vivarium daemon smoke --status-url http://127.0.0.1:8787/status
vivarium local run --goal "build a tiny local agent"
```

After installation, reload your shell if needed and run:

```bash
# [1] Initialize local memory
vivarium local

# [2] Run the local agent
vivarium local run --goal "build a tiny local agent"

# [3] Review launch handoff
vivarium launch handoff

# [4] Keep moving
vivarium status
vivarium help
vivarium update
```

The first local run is offline and uses the built-in local provider. It records
the goal in local memory and shows the consulted skills, traces, prediction,
validation, and next local commands. Provider keys are only needed when you move
from the local agent loop to live model calls.
Use `vivarium status` after a run to confirm the latest local run goal, run ID,
success state, and score from SQLite before moving on.
If you run `vivarium local run` before `vivarium local`, the command seeds the same starter memory first, then runs the local agent against that durable state.
If the local SQLite state file is invalid, `vivarium local run` stops before writing new run data, names the damaged path, and points you at `vivarium doctor` plus `vivarium local` so you can move the file aside and reseed it.

When installed with the LaunchAgent option, verify the local daemon separately:

```bash
vivarium daemon smoke --status-url http://127.0.0.1:8787/status
```

Use `vivarium launch handoff` when you are ready for production evidence. That
command explains provider keys, live smoke tests, and the v1 evidence gate
without blocking the local agent loop.

Use `vivarium setup live` when you are ready to create provider keys with the
default private directories. It creates `~/.vivarium/secrets` for local setup
files such as repo names, world refs, GitHub metadata, provider keys, private
endpoint settings, and internal tokens. It also creates `~/.vivarium/live` for
generated provider, credential, and evidence artifacts, then runs the guided live
setup flow. `vivarium onboard live` remains available as the same live setup
wizard.

`vivarium connect signup` reopens model provider, GitHub/public release, and internal credential handoff guidance without showing raw env-key wiring. It also shows a local value map for generated files such as `~/.vivarium/secrets/anthropic.key` and `~/.vivarium/secrets/internal-health-url.txt`, so setup stays in paste-once local files instead of shell exports.

Live setup path:

```bash
vivarium setup live
vivarium connect signup
# Paste requested values into ~/.vivarium/secrets, then:
vivarium setup live
vivarium connect
vivarium connect setup --confirm-write
vivarium connect smoke
vivarium proof init
vivarium proof
vivarium doctor --live
```

Then use `vivarium connect` for the plain-language names/world, GitHub/public
release, provider, internal credential, and evidence readiness dashboard without
raw env-key wiring. Keep exact env keys and provider-profile commands behind
`--details`. Drop `--confirm-write` only when you want a dry run. Run
`vivarium proof` to review the v1 evidence checklist without raw manifest
section keys.

### Advanced live setup controls

Use `vivarium connect wizard` only when you want to choose those paths yourself. It
creates or reuses the private `~/.vivarium/live/live-readiness.local.env`
readiness file by default, opens the Anthropic and OpenRouter key paths as
terminal guidance, names the private endpoint handoff, and can fill common
provider/internal values from friendly file-backed inputs in the same command.
Prefer the `--secrets-dir ~/.vivarium/secrets` shortcut so secrets do not sit in
shell history. Add `--setup-dir ~/.vivarium/live` when you want generated setup
artifacts in one explicit local directory. Pass `--confirm-write` after
reviewing the filled file when you want it to write the provider profiles,
encrypted credential store, and
evidence skeleton in one step.

## Advanced install controls

Override the layout with `VIVARIUM_INSTALL_DIR`, `VIVARIUM_BIN_DIR`,
`VIVARIUM_WORLD_ROOT`, `VIVARIUM_DOMAIN`, or `VIVARIUM_STATE_PATH`. Set
`VIVARIUM_AGENT_REF` to pin the checkout to a branch, tag, or commit before
dependency installation. The installer infers the non-secret GitHub owner, agent
repo, world repo, and canonical world ref from the GitHub repository URLs while
it runs `vivarium local`; set `VIVARIUM_GITHUB_OWNER`,
`VIVARIUM_AGENT_REPO_NAME`, `VIVARIUM_WORLD_REPO_NAME`,
`VIVARIUM_CANONICAL_WORLD_REF`, and `VIVARIUM_PRIVATE_WORLD_REF` when you need
explicit overrides or a private world ref.

For source checkouts and contributors, install dependencies from the agent workspace:

```bash
bun install
```

Run the local verification suite:

```bash
bun run lint
bun run knip
bun run typecheck
bun run test
bun run build
```

Use the source-checkout shortcuts when `the-agent` sits beside `the-world`.
For the shortest path, run:

```bash
bun run quickstart
```

That runs local setup and a deterministic local goal. If you want to run the
steps separately, use the source-checkout shortcuts:

```bash
bun run local
bun run local:run
```

`bun run local` runs the same quick setup as `bun run vivarium -- local`: it
initializes the same local state as `init`, stages the private live-readiness
file for later when it is missing, renders a terminal-friendly summary, and
prints the next local commands for a first run. Use `bun run vivarium --
local` directly only when you need to pass custom `--world-root` or
`--state-path` values. Use `init` directly only when you need local
initialization without the aggregate setup checklist. Use `vivarium launch
handoff` when you are ready to see the production-only provider, credential, and
evidence workflow.
When repository names are known, add `--github-owner`, `--agent-repo`,
`--world-repo`, `--canonical-world-ref`, and `--private-world-ref` to prefill
the non-secret public GitHub and world values.

Provider-backed runs require credentials for the selected provider. Start with
`vivarium connect wizard` with file-backed secret inputs, inspect the setup file
with `vivarium connect`, then either pass `--confirm-write` to the wizard or run
`vivarium connect setup --confirm-write` to write provider profiles and the
encrypted internal credential.
Run `vivarium connect smoke`, `vivarium proof init`, then
`vivarium proof`, before the final live
doctor gate.
Use the `--*-file` inputs for secret values and plain labels for non-secret
private endpoint metadata.
The generated file already includes public-provider model defaults for
Anthropic and OpenRouter, so first-time setup starts with signup keys and the
private/internal values rather than a model-selection hunt.
Use `docs/guides/configure-providers.md` for low-level provider profile details
and `docs/guides/live-readiness.md` for the full live handoff checklist.
