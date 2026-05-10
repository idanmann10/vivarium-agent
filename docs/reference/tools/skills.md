---
title: Skills Tool
description: Self-tool reference for local procedural skills.
when_to_read: When listing, searching, viewing, using, or tracing local skills.
---

# Skills Tool

The `skills` self-tool reads and updates local procedural memory.

- `list(status?)` returns local skill ids, optionally filtered by status.
- `habitual(domain?)` returns high-trust habitual skills from subscribed world content, optionally scoped to one domain.
- `search(query)` finds local skills by name or body text.
- `view(id)` returns the stored skill body.
- `use(id, helped?)` increments usage and helped counts.
- `lineage(id)` returns known lineage identifiers for the skill.
