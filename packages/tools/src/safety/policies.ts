export type ToolPolicyAction = "approve" | "require_confirmation" | "block";

export interface ToolPolicy {
  readonly id: string;
  readonly pattern: string;
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

function toResolvedPolicy(policy: ToolPolicy): ResolvedToolPolicy {
  return {
    id: policy.id,
    pattern: policy.pattern,
    action: policy.action,
    ...(policy.priority === undefined ? {} : { priority: policy.priority }),
    ...(policy.reason === undefined ? {} : { reason: policy.reason }),
  };
}

export function resolveToolPolicy(
  toolId: string,
  policies: readonly ToolPolicy[],
  defaultAction: ToolPolicyAction = "approve",
): ResolvedToolPolicy {
  const matches = policies
    .map((policy, index) => ({ policy, index }))
    .filter(({ policy }) => matchesToolPattern(toolId, policy.pattern));

  if (matches.length === 0) {
    return {
      id: "default",
      pattern: "*",
      action: defaultAction,
      reason: "Default tool policy action",
    };
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
    return {
      id: "default",
      pattern: "*",
      action: defaultAction,
      reason: "Default tool policy action",
    };
  }

  return toResolvedPolicy(winner.policy);
}
