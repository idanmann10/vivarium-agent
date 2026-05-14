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
runs the guided `setup --quick` command. It also writes a `vivarium` command to
`~/.local/bin` so future commands can run from any directory. Override the layout
with `VIVARIUM_INSTALL_DIR`, `VIVARIUM_BIN_DIR`, `VIVARIUM_WORLD_ROOT`,
`VIVARIUM_DOMAIN`, or `VIVARIUM_STATE_PATH`. Set
`VIVARIUM_GITHUB_OWNER`, `VIVARIUM_AGENT_REPO_NAME`,
`VIVARIUM_WORLD_REPO_NAME`, `VIVARIUM_CANONICAL_WORLD_REF`, and
`VIVARIUM_PRIVATE_WORLD_REF` to prefill the non-secret live-readiness repo
metadata while the installer runs `setup --quick`.

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

After installation, reload your shell if needed and run:

```bash
# [1] Prove the local loop
vivarium run --goal "validate local setup" --state-path .vivarium/state.db

# [2] Prepare live readiness
# Edit live-readiness.local.env locally. Keep it out of git.
vivarium setup --env-file live-readiness.local.env --domain coding --world-root ../the-world --state-path .vivarium/state.db
vivarium setup --env-file live-readiness.local.env --domain coding --world-root ../the-world --state-path .vivarium/state.db --confirm-write

# [3] Inspect configured models
vivarium model --env-file live-readiness.local.env

# [4] Prepare live evidence
vivarium live evidence-init --path v1-evidence.json

# [5] Run the readiness gate
vivarium doctor --live --env-file live-readiness.local.env

# [6] Verify the Mac daemon, when installed with VIVARIUM_DAEMON=launchd
vivarium daemon smoke --status-url http://127.0.0.1:8787/status

# [7] Keep moving
vivarium status
vivarium help
vivarium update
```

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

Run setup with the coding starter pack from a sibling world checkout:

```bash
vivarium setup \
  --quick \
  --domain coding \
  --world-root ../the-world \
  --state-path .vivarium/state.db
```

`setup --quick` initializes the same local state as `init`, creates the private
live-readiness env file from the template when it is missing, renders a
terminal-friendly summary, and prints the next commands for a first run, live
setup, and `doctor --live`. Use `init` directly only when you need local
initialization without the aggregate setup checklist. Use
`vivarium live env-init --path live-readiness.local.env` when you only need to
create the private live-readiness env file.
When repository names are known, add `--github-owner`, `--agent-repo`,
`--world-repo`, `--canonical-world-ref`, and `--private-world-ref` to prefill
the non-secret public GitHub and world values.

Provider-backed runs require environment variables for the selected provider. Use
`docs/guides/configure-providers.md` for provider profiles and `docs/guides/live-readiness.md` for the
full live handoff checklist.
