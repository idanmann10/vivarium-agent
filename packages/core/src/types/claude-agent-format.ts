export const CLAUDE_MANAGED_AGENTS_BETA_HEADER = "managed-agents-2026-04-01" as const;
export const CLAUDE_AGENT_TOOLSET_TYPE = "agent_toolset_20260401" as const;

export const CLAUDE_CODE_SUBAGENT_FRONTMATTER_FIELDS = [
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
] as const;

export const CLAUDE_CODE_PLUGIN_IGNORED_FRONTMATTER_FIELDS = [
  "hooks",
  "mcpServers",
  "permissionMode",
] as const;

export type ClaudeManagedAgentModel =
  | string
  | {
      readonly id: string;
      readonly speed?: "standard" | "fast" | string;
    };

export interface ClaudeManagedAgentTool {
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface ClaudeManagedAgentMcpServer {
  readonly name: string;
  readonly url: string;
  readonly [key: string]: unknown;
}

export type ClaudeManagedAgentSkill =
  | {
      readonly type: "anthropic";
      readonly skill_id: string;
    }
  | {
      readonly type: "custom";
      readonly skill_id: string;
      readonly version?: "latest" | string;
    };

export interface ClaudeManagedAgentMultiagent {
  readonly agents: readonly string[];
  readonly [key: string]: unknown;
}

export interface ClaudeManagedAgentCreateRequest {
  readonly name: string;
  readonly model: ClaudeManagedAgentModel;
  readonly system?: string | null;
  readonly tools?: readonly ClaudeManagedAgentTool[] | null;
  readonly mcp_servers?: readonly ClaudeManagedAgentMcpServer[] | null;
  readonly skills?: readonly ClaudeManagedAgentSkill[] | null;
  readonly multiagent?: ClaudeManagedAgentMultiagent | null;
  readonly description?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type ClaudeCodePermissionMode =
  | "default"
  | "acceptEdits"
  | "auto"
  | "dontAsk"
  | "bypassPermissions"
  | "plan"
  | string;
export type ClaudeCodeMemoryScope = "user" | "project" | "local" | string;
export type ClaudeCodeMcpServerReference = string | Readonly<Record<string, unknown>>;

export interface ClaudeCodeHookCommand {
  readonly command: string;
  readonly [key: string]: unknown;
}

export interface ClaudeCodeSubagentFrontmatter {
  readonly name: string;
  readonly description: string;
  readonly tools?: readonly string[] | string;
  readonly disallowedTools?: readonly string[] | string;
  readonly model?: string;
  readonly permissionMode?: ClaudeCodePermissionMode;
  readonly maxTurns?: number;
  readonly skills?: readonly string[];
  readonly mcpServers?: readonly ClaudeCodeMcpServerReference[];
  readonly hooks?: Readonly<Record<string, readonly ClaudeCodeHookCommand[]>>;
  readonly memory?: ClaudeCodeMemoryScope;
  readonly background?: boolean;
  readonly effort?: string;
  readonly isolation?: "worktree" | string;
  readonly color?: string;
  readonly initialPrompt?: string;
}
