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
runs the guided `setup` command. It also writes a `vivarium` command to
`~/.local/bin` so future commands can run from any directory. Override the layout
with `VIVARIUM_INSTALL_DIR`, `VIVARIUM_BIN_DIR`, `VIVARIUM_WORLD_ROOT`,
`VIVARIUM_DOMAIN`, or `VIVARIUM_STATE_PATH`.

After installation, reload your shell if needed and run:

```bash
vivarium run --goal "validate local setup"
vivarium live env-init --path live-readiness.local.env
vivarium status
vivarium help
vivarium model
vivarium doctor
vivarium setup
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
  --domain coding \
  --world-root ../the-world \
  --state-path .vivarium/state.db
```

`setup` initializes the same local state as `init`, renders a terminal-friendly
summary, and prints the next commands for a first run, live setup, and
`doctor --live`. Use `init` directly only when you need local initialization
without the aggregate setup checklist.
Use `live env-init --path live-readiness.local.env` when you need to create the
private live-readiness env file from the terminal.

Provider-backed runs require environment variables for the selected provider. Use
`docs/guides/configure-providers.md` for provider profiles and `docs/guides/live-readiness.md` for the
full live handoff checklist.
