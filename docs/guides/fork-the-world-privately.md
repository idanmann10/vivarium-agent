---
title: Fork the World Privately
description: Private world subscription pattern.
when_to_read: When configuring internal knowledge.
---

# Fork the World Privately

Private worlds are Git forks with restricted access and higher subscription priority.

Save the canonical world and private fork in a local subscription registry:

```bash
vivarium world subscribe \
  --subscriptions-path ~/.the-agent/world-subscriptions.json \
  --world-root ~/worlds/canonical \
  --world-label canonical \
  --world-ref git@github.com:<owner>/<canonical-world>.git \
  --priority 1

vivarium world subscribe \
  --subscriptions-path ~/.the-agent/world-subscriptions.json \
  --world-root ~/worlds/team-private \
  --world-label team-private \
  --world-ref git@github.com:<owner>/<private-world>.git \
  --priority 0 \
  --auto-push
```

`priority: 0` is searched first. Use `--auto-push` only for the fork where internal-only artifacts are allowed to be proposed.
Visibility-aware proposal helpers route `internal` and `private` skill proposals to an auto-push world and route `public` proposals to the first non-auto-push world.

Search saved subscriptions:

```bash
vivarium world search \
  --subscriptions-path ~/.the-agent/world-subscriptions.json \
  --domain coding \
  --query "<topic>"
```
