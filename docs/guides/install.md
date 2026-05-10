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
bun run typecheck
bun run test
bun run build
```

Initialize a local state database with the coding starter pack from a sibling world checkout:

```bash
bun apps/cli/src/index.ts init \
  --domain coding \
  --world-root ../the-world \
  --state-path .vivarium/state.db
```

Provider-backed runs require environment variables for the selected provider. Use
`docs/guides/configure-providers.md` for provider profiles and `docs/guides/live-readiness.md` for the
full live handoff checklist.
