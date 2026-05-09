export function markRequiresAnonymization(path: string): string {
  return `anonymize:${path}`;
}
