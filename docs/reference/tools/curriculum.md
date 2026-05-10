---
title: Curriculum Tool
description: Self-tool reference for per-domain curriculum reads and progress.
when_to_read: When reading or marking domain curriculum steps.
---

# Curriculum Tool

The `curriculum` self-tool reads local world curriculum files and advances local progress.

- `read(domain)` returns the domain curriculum markdown from the primary local world root.
- `progress(domain)` returns stored progress for the domain, if initialization or prior runs have started it.
- `advance(domain, stepIndex)` marks one curriculum step complete once for the domain.
