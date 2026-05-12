---
title: Tools
description: Self-tools and external tools are dispatched through one surface.
when_to_read: When adding tool access, credentials, or safety checks.
---

# Tools

Self-tools are intercepted by the runtime. External tools go through dispatch so logging, safety, credentials, and attention enforcement are centralized.

The v1 external tool surface is dependency-injected for local testing: web, file, terminal, code, HTTP, MCP, Anthropic native messages, and computer-use calls all route through adapters rather than direct global side effects. Terminal calls can use the Docker sandbox adapter, which runs commands through `docker run --rm --network none` with an optional mounted workspace.

## SelfTools

`SelfTools` mutate or read the agent's own state: memory, skills,
anti-patterns, traces, runs, episodes, world subscriptions, curriculum,
identity, attention, confidence, and publishables. They are handled inside the
runtime so every call can append episodes, share the same state repository, and
avoid pretending that self-modification is just another HTTP request.

## External Dispatcher

External tools go through the dispatcher. The dispatcher parses requests, applies
tool policies, enforces rate limits, rejects credential-like arguments, resolves
credentials, applies safety checks, records warnings, and then calls the injected
adapter. This keeps provider calls, HTTP, files, terminal, MCP, native tool use,
and computer-use behind one auditable boundary.

Tool policies let integrations approve, require confirmation for, or block
external capabilities by exact tool name, subtree pattern, or wildcard. See
[Tool Policies](../reference/tool-policies.md) for the policy fields and
resolution order.
