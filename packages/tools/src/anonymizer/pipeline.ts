import type { LocalProvider } from "../../../providers/src/index.js";

export interface ProviderAnonymizationResult {
  readonly method: "provider" | "regex-fallback";
  readonly text: string;
}

export function markRequiresAnonymization(path: string): string {
  return `anonymize:${path}`;
}

export function anonymizeText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED_TOKEN]")
    .replace(/\/Users\/[^/\s]+/g, "[REDACTED_HOME]");
}

export async function anonymizeTextWithProvider(
  text: string,
  provider?: LocalProvider,
): Promise<ProviderAnonymizationResult> {
  const deterministicText = anonymizeText(text);
  if (provider === undefined) {
    return { method: "regex-fallback", text: deterministicText };
  }

  try {
    const providerText = await provider.complete({ kind: "anonymize", input: deterministicText });
    return { method: "provider", text: anonymizeText(providerText) };
  } catch {
    return { method: "regex-fallback", text: deterministicText };
  }
}
