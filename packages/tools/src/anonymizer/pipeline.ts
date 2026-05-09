export function markRequiresAnonymization(path: string): string {
  return `anonymize:${path}`;
}

export function anonymizeText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED_TOKEN]")
    .replace(/\/Users\/[^/\s]+/g, "[REDACTED_HOME]");
}
