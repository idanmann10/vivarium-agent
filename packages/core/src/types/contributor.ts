import type { ContributorId } from "../ids.js";

export interface Contributor {
  readonly handle: ContributorId;
  readonly firstContribution: string;
  readonly domains: readonly string[];
  readonly contributions: {
    readonly skills: number;
    readonly antiPatterns: number;
    readonly traces: number;
    readonly runsPublished: number;
    readonly skillsArchived: number;
  };
  readonly trustScore: number;
  readonly domainTrust: Readonly<Record<string, number>>;
}
