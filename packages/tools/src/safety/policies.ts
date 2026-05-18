export type ToolPolicyAction = "approve" | "require_confirmation" | "block";

export interface ToolPolicy {
  readonly id: string;
  readonly pattern: string;
  readonly commandPrefix?: readonly string[];
  readonly action: ToolPolicyAction;
  readonly priority?: number;
  readonly reason?: string;
}

export interface ResolvedToolPolicy {
  readonly id: string;
  readonly pattern: string;
  readonly action: ToolPolicyAction;
  readonly priority?: number;
  readonly reason?: string;
  readonly subject?: string;
}

export interface ToolPolicyEvaluation {
  readonly action: ToolPolicyAction;
  readonly policy: ResolvedToolPolicy;
  readonly decisions: readonly ResolvedToolPolicy[];
}

export interface ToolPolicyRequest {
  readonly toolId: string;
  readonly args?: unknown;
}

interface ShellCommandSegment {
  readonly raw: string;
  readonly argv: readonly string[];
  readonly prefixEligible: boolean;
  readonly unsupportedReason?: string;
}

function matchesToolPattern(toolId: string, pattern: string): boolean {
  if (pattern === "*") {
    return true;
  }

  if (pattern.endsWith(".*")) {
    return toolId.startsWith(pattern.slice(0, -1));
  }

  return toolId === pattern;
}

function policyRank(policy: ToolPolicy, index: number): number {
  return policy.priority ?? index;
}

function toResolvedPolicy(policy: ToolPolicy, subject?: string): ResolvedToolPolicy {
  return {
    id: policy.id,
    pattern: policy.pattern,
    action: policy.action,
    ...(policy.priority === undefined ? {} : { priority: policy.priority }),
    ...(policy.reason === undefined ? {} : { reason: policy.reason }),
    ...(subject === undefined ? {} : { subject }),
  };
}

function defaultPolicy(
  action: ToolPolicyAction,
  reason = "Default tool policy action",
  subject?: string,
): ResolvedToolPolicy {
  return {
    id: "default",
    pattern: "*",
    action,
    reason,
    ...(subject === undefined ? {} : { subject }),
  };
}

function hasCommandPrefixPolicy(toolId: string, policies: readonly ToolPolicy[]): boolean {
  return policies.some((policy) => policy.commandPrefix !== undefined && matchesToolPattern(toolId, policy.pattern));
}

function commandPrefixMatches(argv: readonly string[], commandPrefix: readonly string[]): boolean {
  if (commandPrefix.length === 0 || commandPrefix.length > argv.length) {
    return false;
  }

  return commandPrefix.every((part, index) => argv[index] === part);
}

function policyMatchesSubject(
  toolId: string,
  policy: ToolPolicy,
  commandSegment?: ShellCommandSegment,
): boolean {
  if (!matchesToolPattern(toolId, policy.pattern)) {
    return false;
  }

  if (policy.commandPrefix === undefined) {
    return true;
  }

  return (
    commandSegment !== undefined &&
    commandSegment.prefixEligible &&
    commandPrefixMatches(commandSegment.argv, policy.commandPrefix)
  );
}

function isActionMoreRestrictive(left: ToolPolicyAction, right: ToolPolicyAction): boolean {
  const rank: Readonly<Record<ToolPolicyAction, number>> = {
    approve: 0,
    require_confirmation: 1,
    block: 2,
  };
  return rank[left] > rank[right];
}

function hasUnquotedShellSyntax(command: string, index: number, quote: "'" | "\"" | undefined): boolean {
  return quote === undefined && command[index] !== undefined;
}

function splitShellCommand(command: string): readonly string[] {
  const segments: string[] = [];
  let current = "";
  let quote: "'" | "\"" | undefined;
  let escaped = false;

  function pushCurrent(): void {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      segments.push(trimmed);
    }
    current = "";
  }

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (char === undefined) {
      continue;
    }

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }

    if (char === "'" && quote !== "\"") {
      quote = quote === "'" ? undefined : "'";
      current += char;
      continue;
    }

    if (char === "\"" && quote !== "'") {
      quote = quote === "\"" ? undefined : "\"";
      current += char;
      continue;
    }

    if (quote === undefined && (char === ";" || char === "\n")) {
      pushCurrent();
      continue;
    }

    if (quote === undefined && char === "&") {
      if (command[index + 1] === "&") {
        pushCurrent();
        index += 1;
        continue;
      }
      current += char;
      continue;
    }

    if (quote === undefined && char === "|") {
      pushCurrent();
      if (command[index + 1] === "|") {
        index += 1;
      }
      continue;
    }

    current += char;
  }

  pushCurrent();
  return segments.length === 0 ? [command.trim()] : segments;
}

function isEnvironmentAssignment(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=/.test(value);
}

function parseShellSegment(raw: string): ShellCommandSegment {
  const argv: string[] = [];
  let current = "";
  let quote: "'" | "\"" | undefined;
  let escaped = false;
  let unsupportedReason: string | undefined;

  function pushCurrent(): void {
    if (current.length > 0) {
      argv.push(current);
      current = "";
    }
  }

  function markUnsupported(reason: string): void {
    unsupportedReason ??= reason;
  }

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === undefined) {
      continue;
    }

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }

    if (char === "'" && quote !== "\"") {
      quote = quote === "'" ? undefined : "'";
      continue;
    }

    if (char === "\"" && quote !== "'") {
      quote = quote === "\"" ? undefined : "\"";
      continue;
    }

    if (/\s/.test(char) && quote === undefined) {
      pushCurrent();
      continue;
    }

    if (hasUnquotedShellSyntax(raw, index, quote) && (char === ">" || char === "<")) {
      markUnsupported("redirection");
    }

    if (hasUnquotedShellSyntax(raw, index, quote) && (char === "(" || char === ")")) {
      markUnsupported("subshell");
    }

    if (hasUnquotedShellSyntax(raw, index, quote) && char === "$" && raw[index + 1] === "(") {
      markUnsupported("command substitution");
    }

    if (hasUnquotedShellSyntax(raw, index, quote) && char === "`") {
      markUnsupported("command substitution");
    }

    if (hasUnquotedShellSyntax(raw, index, quote) && (char === "*" || char === "?")) {
      markUnsupported("wildcard expansion");
    }

    if (hasUnquotedShellSyntax(raw, index, quote) && char === "&") {
      markUnsupported("background execution");
    }

    current += char;
  }

  pushCurrent();
  if (quote !== undefined || escaped) {
    markUnsupported("unclosed quote or escape");
  }

  if (argv[0] !== undefined && isEnvironmentAssignment(argv[0])) {
    markUnsupported("environment assignment");
  }

  return {
    raw,
    argv,
    prefixEligible: unsupportedReason === undefined && argv.length > 0,
    ...(unsupportedReason === undefined ? {} : { unsupportedReason }),
  };
}

function parseShellCommand(command: string): readonly ShellCommandSegment[] {
  return splitShellCommand(command).map(parseShellSegment);
}

function resolveForSubject(
  toolId: string,
  policies: readonly ToolPolicy[],
  defaultAction: ToolPolicyAction,
  commandSegment?: ShellCommandSegment,
): ResolvedToolPolicy {
  const matches = policies
    .map((policy, index) => ({ policy, index }))
    .filter(({ policy }) => policyMatchesSubject(toolId, policy, commandSegment));

  const subject = commandSegment?.raw;
  if (matches.length === 0) {
    const reason =
      commandSegment !== undefined &&
      !commandSegment.prefixEligible &&
      hasCommandPrefixPolicy(toolId, policies)
        ? `Default tool policy action; shell command segment is not eligible for command-prefix policy matching: ${commandSegment.unsupportedReason}`
        : "Default tool policy action";
    return defaultPolicy(defaultAction, reason, subject);
  }

  const orderedMatches = matches.sort((left, right) => {
    const rankDifference = policyRank(left.policy, left.index) - policyRank(right.policy, right.index);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    const idDifference = left.policy.id.localeCompare(right.policy.id);
    return idDifference === 0 ? left.index - right.index : idDifference;
  });
  const winner = orderedMatches[0];
  if (winner === undefined) {
    return defaultPolicy(defaultAction, "Default tool policy action", subject);
  }

  return toResolvedPolicy(winner.policy, subject);
}

export function resolveToolPolicy(
  toolId: string,
  policies: readonly ToolPolicy[],
  defaultAction: ToolPolicyAction = "approve",
): ResolvedToolPolicy {
  return evaluateToolPolicyForRequest({ toolId }, policies, defaultAction).policy;
}

function commandFromArgs(args: unknown): string | undefined {
  return typeof args === "object" &&
    args !== null &&
    !Array.isArray(args) &&
    "command" in args &&
    typeof args.command === "string"
    ? args.command
    : undefined;
}

export function resolveToolPolicyForRequest(
  request: ToolPolicyRequest,
  policies: readonly ToolPolicy[],
  defaultAction: ToolPolicyAction = "approve",
): ResolvedToolPolicy {
  return evaluateToolPolicyForRequest(request, policies, defaultAction).policy;
}

export function evaluateToolPolicyForRequest(
  request: ToolPolicyRequest,
  policies: readonly ToolPolicy[],
  defaultAction: ToolPolicyAction = "approve",
): ToolPolicyEvaluation {
  const command = request.toolId === "terminal.run" ? commandFromArgs(request.args) : undefined;
  if (command === undefined) {
    const policy = resolveForSubject(request.toolId, policies, defaultAction);
    return { action: policy.action, policy, decisions: [policy] };
  }

  const segments = parseShellCommand(command);
  const decisions = segments.map((segment) => resolveForSubject(request.toolId, policies, defaultAction, segment));
  const policy = decisions.reduce((winner, decision) =>
    isActionMoreRestrictive(decision.action, winner.action) ? decision : winner,
  );
  return { action: policy.action, policy, decisions };
}
