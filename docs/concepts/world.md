---
title: World
description: How the agent reads from and contributes to shared culture.
when_to_read: When implementing retrieval, subscriptions, pull, push, or publish paths.
---

# World

The world is a Git-hosted commons of skills, anti-patterns, traces, runs, exemplars, rubrics, curricula, contributors, and featured picks.

The agent reads culture from one or more worlds. A typical install subscribes to
a canonical public world plus a private team fork, with lower priority numbers
searched first when private knowledge should win.

## Read Path

World subscriptions point at local clones or pulled repositories. Search can read
skills, traces, anti-patterns, runs, curricula, and featured metadata from every
configured source while preserving labels so the agent knows where context came
from.

## Write Path

Local proposals are serialized into the selected world. Public proposals usually
target the canonical world through a pull request; private or internal proposals
can route to an auto-push private subscription. Accepted artifacts then become
retrievable by another install, which is the local cultural transmission check.
