import { externalToolsets } from "../../../../packages/tools/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

export interface ToolsToolsetSummary {
  readonly name: string;
  readonly tools: readonly string[];
}

export interface ToolsCommandResult {
  readonly toolsets: readonly string[];
  readonly toolsetSummaries: readonly ToolsToolsetSummary[];
  readonly defaultPolicyAction: string;
  readonly safetyDefaults: readonly string[];
  readonly terminalPolicyExamples: readonly string[];
  readonly nextCommands: readonly string[];
}

const toolsetTools: Readonly<Record<string, readonly string[]>> = {
  web: ["web.fetch", "web.read", "web.search"],
  file: ["file.read", "file.write", "file.edit"],
  terminal: ["terminal.run"],
  code: ["code.execute"],
  http: ["http.request"],
  mcp: ["mcp.call"],
  "anthropic-native": ["anthropic-native.messages.create"],
  "computer-use": [
    "computer.screenshot",
    "computer.click",
    "computer.type",
    "computer.scroll",
    "computer.list_windows",
    "computer.focus_window",
  ],
};

export function toolsCommand(): ToolsCommandResult {
  const toolsets = [...externalToolsets];
  return {
    toolsets,
    toolsetSummaries: toolsets.map((name) => ({ name, tools: toolsetTools[name] ?? [] })),
    defaultPolicyAction: "approve unless configured otherwise",
    safetyDefaults: [
      "Tool policies: approve unless configured otherwise",
      "Rate limits: enforced per run and per day when configured",
      "Credential-like arguments: blocked before adapter dispatch",
      "HTTP requests: allowlist and destructive confirmation when configured",
      "Computer click/type: confirmation for system-level targets and password fields",
      "Tool output: prompt-injection warnings are surfaced",
    ],
    terminalPolicyExamples: [
      "commandPrefix: git status -> approve read-only status commands",
      "commandPrefix: rm -> require confirmation before file removal",
      "git status && rm -rf build -> evaluated segment by segment",
      "redirection, subshells, command substitution, env assignments, and wildcards fall back to the default terminal.run policy",
    ],
    nextCommands: [
      "vivarium help",
      "vivarium model",
      "vivarium connect",
      "vivarium doctor --live",
    ],
  };
}

function renderToolset(summary: ToolsToolsetSummary): readonly string[] {
  return [
    `  [toolset] ${summary.name}`,
    `            ${summary.tools.join(", ")}`,
  ];
}

export function renderToolsCommandResult(result: ToolsCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Tools",
    "--------------",
    "Read-only dashboard",
    "",
    "External toolsets",
    ...result.toolsetSummaries.flatMap(renderToolset),
    "",
    "Safety defaults",
    ...result.safetyDefaults.map((line) => `  ${line}`),
    "",
    "Terminal policy examples",
    ...result.terminalPolicyExamples.map((line) => `  ${line}`),
    "",
    "Next commands",
    ...result.nextCommands.map((command) => `  ${command}`),
    "",
  ].join("\n");
}
