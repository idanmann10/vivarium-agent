# Documentation

Docs use progressive disclosure:

1. Frontmatter for indexing.
2. Focused body for one question.
3. References only when a deep dive is needed.

Start with `thesis.md` when you need the product argument: why this agent grows
through memory, Dream, and the world instead of through per-agent prompting.

Use the directories by question:

- `architecture/` explains package ownership and runtime data flow.
- `concepts/` explains kernel, memory, primitives, world, tools, safety, trust,
  and other roadmap concepts.
- `guides/` gives operational workflows for install, providers, credentials,
  live readiness, private worlds, local Compose, and authoring artifacts.
- `reference/` documents concrete schemas, artifact formats, episode kinds, and
  self-tool groups.
- `math/` records the formulas and thresholds used by retrieval, trust, stages,
  surprise, and diversity.
- `demos/` records local checkpoint demonstrations such as the end-to-end
  asciinema cast.

Common operational guides:

- [Live Readiness](guides/live-readiness.md): clear remotes, credentials, GitHub auth, and Docker Compose blockers before live v1 verification.
- [Live Readiness Env Template](live-readiness.env.example): copyable environment skeleton for the `doctor --live` handoff.
- [Claude Agent Formats](reference/claude-agent-formats.md): current Claude Managed Agents, Claude Code subagent, and team shapes to check before adding agent-facing types.
