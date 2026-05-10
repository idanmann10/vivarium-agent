export interface SafetyDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

export interface OutputSafetyFinding {
  readonly reason: string;
}

export interface HttpSafetyRequest {
  readonly url: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly allowlist: readonly string[];
  readonly destructiveRequiresConfirmation: boolean;
  readonly confirmed: boolean;
}

export function evaluateHttpSafety(request: HttpSafetyRequest): SafetyDecision {
  const allowedHost = request.allowlist.some((prefix) => request.url.startsWith(prefix));
  if (!allowedHost) {
    return { allowed: false, reason: "URL is outside the configured allowlist" };
  }

  const destructive = request.method === "DELETE" || request.method === "PUT" || request.method === "PATCH";
  if (destructive && request.destructiveRequiresConfirmation && !request.confirmed) {
    return { allowed: false, reason: "Destructive request requires confirmation" };
  }

  return { allowed: true, reason: "Request passed safety checks" };
}

const promptInjectionPatterns = [
  { pattern: /ignore previous instructions/i, label: "ignore previous instructions" },
  { pattern: /you are now/i, label: "you are now" },
  { pattern: /call\s+[a-z0-9_.-]+\s*run/i, label: "suspicious tool-use suggestion" },
  { pattern: /override (the )?(system|developer) prompt/i, label: "prompt override instruction" },
] as const;

function textFromValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function scanToolOutputForPromptInjection(value: unknown): readonly OutputSafetyFinding[] {
  const text = textFromValue(value);
  return promptInjectionPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => ({ reason: `Tool output may contain prompt injection: ${label}` }));
}
