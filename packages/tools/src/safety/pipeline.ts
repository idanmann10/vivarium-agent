export interface SafetyDecision {
  readonly allowed: boolean;
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
