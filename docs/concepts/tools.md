---
title: Tools
description: Self-tools and external tools are dispatched through one surface.
when_to_read: When adding tool access, credentials, or safety checks.
---

# Tools

Self-tools are intercepted by the runtime. External tools go through dispatch so logging, safety, credentials, and attention enforcement are centralized.

The v1 external tool surface is dependency-injected for local testing: web, file, terminal, code, HTTP, MCP, Anthropic native messages, and computer-use calls all route through adapters rather than direct global side effects.
