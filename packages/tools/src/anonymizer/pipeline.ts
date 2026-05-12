import type { LocalProvider } from "../../../providers/src/index.js";

export interface ProviderAnonymizationResult {
  readonly method: "provider" | "regex-fallback";
  readonly text: string;
}

export function markRequiresAnonymization(path: string): string {
  return `anonymize:${path}`;
}

function isEmailLocalChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57) ||
    char === "." ||
    char === "_" ||
    char === "%" ||
    char === "+" ||
    char === "-"
  );
}

function isEmailDomainChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57) || char === "." || char === "-";
}

function hasValidEmailDomain(domain: string): boolean {
  const lastDot = domain.lastIndexOf(".");
  if (lastDot <= 0 || lastDot >= domain.length - 2) {
    return false;
  }
  for (let index = lastDot + 1; index < domain.length; index += 1) {
    const code = domain.charCodeAt(index);
    if (!((code >= 65 && code <= 90) || (code >= 97 && code <= 122))) {
      return false;
    }
  }
  return true;
}

function redactEmails(text: string): string {
  let output = "";
  let cursor = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "@") {
      continue;
    }

    let start = index - 1;
    while (start >= cursor && isEmailLocalChar(text[start] ?? "")) {
      start -= 1;
    }
    start += 1;

    let end = index + 1;
    while (end < text.length && isEmailDomainChar(text[end] ?? "")) {
      end += 1;
    }

    const local = text.slice(start, index);
    const domain = text.slice(index + 1, end);
    if (local.length === 0 || !hasValidEmailDomain(domain)) {
      continue;
    }

    output += text.slice(cursor, start);
    output += "[REDACTED_EMAIL]";
    cursor = end;
    index = end - 1;
  }
  return output + text.slice(cursor);
}

export function anonymizeText(text: string): string {
  return redactEmails(text)
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
