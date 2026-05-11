---
title: Claude Agent Formats
description: External Claude Managed Agents and Claude Code subagent shapes to keep in mind when modeling Vivarium agents.
when_to_read: When adding agent configuration, provider routing, subagent, team, or managed-runtime compatibility.
---

# Claude Agent Formats

This project owns its local-first runtime, but external Claude surfaces are useful
format references when adding agent-facing types. Checked against Anthropic and
Claude Code docs on 2026-05-11:

- Claude Managed Agents overview: https://platform.claude.com/docs/en/managed-agents/overview
- Define your agent: https://platform.claude.com/docs/en/managed-agents/agent-setup
- Managed Agent tools: https://platform.claude.com/docs/en/managed-agents/tools
- Managed Agent skills: https://platform.claude.com/docs/en/managed-agents/skills
- Managed Agent MCP connector: https://platform.claude.com/docs/en/managed-agents/mcp-connector
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code agent teams: https://code.claude.com/docs/en/agent-teams

## Claude Managed Agents

Claude Managed Agents separates four concepts:

| Concept | Meaning for our type design |
| --- | --- |
| Agent | Reusable, versioned bundle of `name`, `model`, `system`, `tools`, `mcp_servers`, and `skills`. |
| Environment | Container template: installed packages, network policy, and mounted files. |
| Session | One running agent instance against an Environment for a concrete task. |
| Events | Persisted messages, tool results, status updates, and streamed responses. |

Do not collapse these into one local type. Vivarium can have its own `AgentConfig`
and run records, but any future Managed Agents bridge should keep model/system/tool
selection on the Agent-like resource, execution filesystem/network concerns on the
Environment-like resource, and per-goal state on the Session-like resource.

Managed Agents API calls require the `managed-agents-2026-04-01` beta header. The
agent toolset type is currently `agent_toolset_20260401`, which enables built-in
tools such as `bash`, `read`, `write`, `edit`, `glob`, `grep`, web search/fetch,
and code execution when included in the agent configuration. Custom tools are
also supported, but the application executes them and sends results back.

Skills attached to a Managed Agent are typed by source:

```json
{ "type": "anthropic", "skill_id": "xlsx" }
{ "type": "custom", "skill_id": "skill_abc123", "version": "latest" }
```

MCP is intentionally split: agent creation declares `mcp_servers` by name and URL;
session creation supplies auth through a vault. Keep secrets out of reusable
agent definitions.

## Claude Code Subagents

File-based subagents use Markdown with YAML frontmatter followed by the system
prompt body. Required fields are `name` and `description`.

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
isolation: worktree
---

Review modified code and return prioritized findings.
```

Important scopes and priority:

| Source | Scope | Priority |
| --- | --- | --- |
| Managed settings | Organization-wide | Highest |
| `--agents` | Current session JSON | Above project/user/plugin |
| `.claude/agents/` | Current project | Project-specific |
| `~/.claude/agents/` | User-wide | Personal |
| Plugin `agents/` | Enabled plugin | Lowest |

Supported frontmatter includes `tools`, `disallowedTools`, `model`,
`permissionMode`, `mcpServers`, `skills`, `hooks`, and `isolation`. Plugin
agents ignore `hooks`, `mcpServers`, and `permissionMode` for security.

When an agent runs as the main thread, subagent spawning can be restricted in the
`tools` field:

```yaml
tools: Agent(worker, researcher), Read, Bash
```

`Agent(worker, researcher)` is an allowlist of spawnable agent types. `Agent`
without parentheses allows any subagent type; omitting `Agent` prevents spawning.
Subagents themselves cannot spawn other subagents, so this allowlist matters for
main-session agents, not for nested subagent files.

## Agent Teams

Agent teams are separate Claude Code sessions with a lead and independent
teammates. They are experimental and have coordination overhead. Use subagents
when a focused worker only needs to report a result; use teams when teammates
need to communicate with each other.

Team config lives under `~/.claude/teams/{team-name}/config.json` and includes
runtime state such as session IDs plus each member's agent type. Do not model a
project-level `.claude/teams/teams.json`; Claude treats that as an ordinary file.
Reusable teammate roles should be represented as subagent definitions, and a
teammate can be spawned using a named subagent type. In that path, the teammate
honors the definition's `tools` allowlist and `model`, while the definition body
is appended to the teammate's system prompt as additional instructions.

## Vivarium Guidance

When adding local agent-building features:

- Keep our local kernel small; do not turn Claude subagent prompt bodies into
  Vivarium identity or personality prompts.
- Preserve type boundaries: Agent-like config, Environment-like execution
  substrate, Session/run state, and Event/episode history should stay distinct.
- Treat tool access as a typed capability surface. Model allowlists such as
  `Agent(worker, researcher)` explicitly instead of using free-form prose.
- Keep credential values out of reusable agent/profile/world definitions. Store
  only env-var names, vault references, or credential IDs.
- If adding Claude compatibility export, emit valid YAML frontmatter for
  file-based subagents and valid JSON for `--agents` session definitions.
