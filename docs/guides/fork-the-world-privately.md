---
title: Fork the World Privately
description: Private world subscription pattern.
when_to_read: When configuring internal knowledge.
---

# Fork the World Privately

Private worlds are Git forks with restricted access and higher subscription priority.

Save the canonical world and private fork in a local subscription registry:

```bash
bun apps/cli/src/index.ts world subscribe \
  --subscriptions-path ~/.the-agent/world-subscriptions.json \
  --world-root ~/worlds/canonical \
  --world-label canonical \
  --world-ref git@github.com:<owner>/<canonical-world>.git \
  --priority 1

bun apps/cli/src/index.ts world subscribe \
  --subscriptions-path ~/.the-agent/world-subscriptions.json \
  --world-root ~/worlds/team-private \
  --world-label team-private \
  --world-ref git@github.com:<owner>/<private-world>.git \
  --priority 0 \
  --auto-push
```

`priority: 0` is searched first. Use `--auto-push` only for the fork where internal-only artifacts are allowed to be proposed.

Search saved subscriptions:

```bash
bun apps/cli/src/index.ts world search \
  --subscriptions-path ~/.the-agent/world-subscriptions.json \
  --domain coding \
  --query "<topic>"
```
