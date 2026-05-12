---
title: Install
description: How to install the local agent.
when_to_read: When setting up a development or user install.
---

# Install

Install dependencies from the agent workspace:

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

Run the setup entrypoint with the coding starter pack from a sibling world checkout:

```bash
bun apps/cli/src/main.ts setup \
  --domain coding \
  --world-root ../the-world \
  --state-path .vivarium/state.db
```

`setup` initializes the same local state as `init`, renders a terminal-friendly
summary, and prints the next commands for a first run, live setup, and
`doctor --live`. Use `init` directly only when you need the raw JSON result.

Provider-backed runs require environment variables for the selected provider. Use
`docs/guides/configure-providers.md` for provider profiles and `docs/guides/live-readiness.md` for the
full live handoff checklist.
