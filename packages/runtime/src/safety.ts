export type GoalSafetyDecision =
  | {
      readonly kind: "allow";
    }
  | {
      readonly kind: "refuse";
      readonly reason: string;
      readonly category: "harmful" | "unauthorized" | "out_of_scope" | "destructive";
    }
  | {
      readonly kind: "confirm_destructive";
      readonly reason: string;
    };

const harmfulPatterns = [/\bharm\b/i, /\bmalware\b/i, /\bsteal\b/i, /\bcredential theft\b/i];
const destructivePatterns = [/\bdelete\b/i, /\bdrop\b/i, /\bdestroy\b/i, /\bwipe\b/i];

export function classifyGoalSafety(goal: string, destructiveConfirmed = false): GoalSafetyDecision {
  if (harmfulPatterns.some((pattern) => pattern.test(goal))) {
    return {
      kind: "refuse",
      reason: "Request appears harmful and is refused by the kernel safety contract.",
      category: "harmful",
    };
  }

  if (!destructiveConfirmed && destructivePatterns.some((pattern) => pattern.test(goal))) {
    return {
      kind: "confirm_destructive",
      reason: "Destructive action requires user confirmation before execution.",
    };
  }

  return { kind: "allow" };
}
