export interface StatusSummary {
  readonly repo: string;
  readonly runtime: "offline-local";
}

export function statusCommand(): StatusSummary {
  return { repo: "the-agent", runtime: "offline-local" };
}
