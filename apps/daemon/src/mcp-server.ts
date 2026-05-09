export const mcpServerName = "the-agent-runtime";

export interface McpToolDescriptor {
  readonly name: "run_goal" | "dream" | "status";
  readonly description: string;
}

export interface McpToolManifest {
  readonly serverName: string;
  readonly tools: readonly McpToolDescriptor[];
}

export function createMcpToolManifest(): McpToolManifest {
  return {
    serverName: mcpServerName,
    tools: [
      { name: "run_goal", description: "Run a local goal through the runtime orchestrator." },
      { name: "dream", description: "Run deterministic Dream consolidation over local state." },
      { name: "status", description: "Return local daemon status and counters." },
    ],
  };
}
