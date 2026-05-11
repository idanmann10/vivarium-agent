import { describe, expect, test } from "bun:test";

import {
  CLAUDE_AGENT_TOOLSET_TYPE,
  CLAUDE_CODE_PLUGIN_IGNORED_FRONTMATTER_FIELDS,
  CLAUDE_CODE_SUBAGENT_FRONTMATTER_FIELDS,
  CLAUDE_MANAGED_AGENTS_BETA_HEADER,
  type ClaudeCodeSubagentFrontmatter,
  type ClaudeManagedAgentCreateRequest,
} from "../index.js";

const managedAgent = {
  name: "Coding Assistant",
  model: { id: "claude-opus-4-7", speed: "standard" },
  system: "Use the local kernel and keep credentials out of reusable definitions.",
  tools: [{ type: CLAUDE_AGENT_TOOLSET_TYPE }],
  mcp_servers: [{ name: "github", url: "https://mcp.example.test" }],
  skills: [{ type: "custom", skill_id: "skill_abc123", version: "latest" }],
  multiagent: { agents: ["worker", "researcher"] },
  description: "Coding agent compatibility fixture",
  metadata: { source: "vivarium" },
} as const satisfies ClaudeManagedAgentCreateRequest;

const subagentFrontmatter = {
  name: "code-reviewer",
  description: "Reviews code for quality and best practices",
  tools: ["Agent(worker, researcher)", "Read", "Bash"],
  disallowedTools: ["Write"],
  model: "sonnet",
  permissionMode: "plan",
  maxTurns: 6,
  skills: ["review-findings-first"],
  mcpServers: ["github"],
  hooks: { TeammateIdle: [{ command: "bun test" }] },
  memory: "project",
  background: true,
  effort: "high",
  isolation: "worktree",
  color: "blue",
  initialPrompt: "Inspect the diff first.",
} as const satisfies ClaudeCodeSubagentFrontmatter;

describe("Claude agent format compatibility", () => {
  test("exports Managed Agents beta and toolset constants", () => {
    expect(CLAUDE_MANAGED_AGENTS_BETA_HEADER).toBe("managed-agents-2026-04-01");
    expect(CLAUDE_AGENT_TOOLSET_TYPE).toBe("agent_toolset_20260401");
    expect(managedAgent).toMatchObject({
      model: { id: "claude-opus-4-7", speed: "standard" },
      multiagent: { agents: ["worker", "researcher"] },
      metadata: { source: "vivarium" },
    });
  });

  test("exports Claude Code frontmatter field sets", () => {
    expect(CLAUDE_CODE_SUBAGENT_FRONTMATTER_FIELDS).toEqual([
      "tools",
      "disallowedTools",
      "model",
      "permissionMode",
      "maxTurns",
      "skills",
      "mcpServers",
      "hooks",
      "memory",
      "background",
      "effort",
      "isolation",
      "color",
      "initialPrompt",
    ]);
    expect(CLAUDE_CODE_PLUGIN_IGNORED_FRONTMATTER_FIELDS).toEqual(["hooks", "mcpServers", "permissionMode"]);
    expect(subagentFrontmatter.tools).toContain("Agent(worker, researcher)");
  });
});
