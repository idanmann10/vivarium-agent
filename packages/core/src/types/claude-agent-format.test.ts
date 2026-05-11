import { describe, expect, test } from "bun:test";

import {
  CLAUDE_AGENT_TOOLSET_TYPE,
  CLAUDE_CODE_PLUGIN_IGNORED_FRONTMATTER_FIELDS,
  CLAUDE_CODE_SUBAGENT_FRONTMATTER_FIELDS,
  CLAUDE_MANAGED_AGENTS_BETA_HEADER,
  type ClaudeCodeSubagentFrontmatter,
  type ClaudeManagedAgentCreateRequest,
  type ClaudeManagedEnvironmentCreateRequest,
  type ClaudeManagedEvent,
  type ClaudeManagedEventType,
  type ClaudeManagedEventsSendRequest,
  type ClaudeManagedSessionCreateRequest,
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

const managedEnvironment = {
  name: "python-dev",
  config: {
    type: "cloud",
    packages: {
      pip: ["pandas==2.2.0"],
      npm: ["express"],
    },
    networking: {
      type: "limited",
      allowed_hosts: ["https://api.example.test"],
      allow_mcp_servers: true,
      allow_package_managers: false,
    },
  },
} as const satisfies ClaudeManagedEnvironmentCreateRequest;

const managedSession = {
  agent: { type: "agent", id: "agnt_abc123", version: 1 },
  environment_id: "env_abc123",
  vault_ids: ["vault_abc123"],
} as const satisfies ClaudeManagedSessionCreateRequest;

const userMessageEventType: ClaudeManagedEventType = "user.message";

const managedEvent = {
  type: userMessageEventType,
  content: [{ type: "text", text: "List the files in the working directory." }],
  processed_at: null,
} as const satisfies ClaudeManagedEvent;

const managedEventsSendRequest = {
  events: [managedEvent],
} as const satisfies ClaudeManagedEventsSendRequest;

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

  test("exports Managed Agents environment, session, and event request shapes", () => {
    expect(managedEnvironment).toMatchObject({
      name: "python-dev",
      config: {
        type: "cloud",
        packages: { pip: ["pandas==2.2.0"], npm: ["express"] },
        networking: {
          type: "limited",
          allowed_hosts: ["https://api.example.test"],
          allow_mcp_servers: true,
          allow_package_managers: false,
        },
      },
    });
    expect(managedSession).toMatchObject({
      agent: { type: "agent", id: "agnt_abc123", version: 1 },
      environment_id: "env_abc123",
      vault_ids: ["vault_abc123"],
    });
    expect(managedEvent).toMatchObject({
      type: "user.message",
      processed_at: null,
      content: [{ type: "text", text: "List the files in the working directory." }],
    });
    expect(managedEventsSendRequest.events).toHaveLength(1);
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
