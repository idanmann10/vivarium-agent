---
title: Memory Tool
description: Self-tool reference for memory reads and writes.
when_to_read: When implementing memory tool dispatch.
---

# Memory Tool

The `memory` self-tool reads and writes working, episodic, semantic, procedural, and identity memory through runtime-managed interfaces.

- `write(request)` stores a semantic fact with domain, subject, content, and optional importance.
- `recall(query, limit?)` retrieves matching semantic fact bodies, capped by the optional limit.
- `list(domain?)` returns semantic fact identifiers, optionally scoped to one domain.
- `forget(id)` deletes a semantic fact by id and returns whether a record was removed.
- `summarize()` returns a compact textual summary of current semantic memory.
