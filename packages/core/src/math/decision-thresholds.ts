export function shouldPromoteCandidate(input: { readonly lowerBound: number; readonly uses: number }): boolean {
  return input.lowerBound >= 0.5 && input.uses >= 3;
}

export interface PushEvidenceRun {
  readonly runId: string;
  readonly goal: string;
}

function normalizedEvidenceGoal(goal: string): string {
  return goal.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hasCrossValidatedEvidence(evidenceRuns: readonly PushEvidenceRun[]): boolean {
  const validEvidence = evidenceRuns.filter((run) => run.runId.trim().length > 0 && run.goal.trim().length > 0);
  return (
    new Set(validEvidence.map((run) => run.runId.trim())).size >= 2 &&
    new Set(validEvidence.map((run) => normalizedEvidenceGoal(run.goal))).size >= 2
  );
}

export function shouldPushToWorld(input: {
  readonly lowerBound: number;
  readonly uses: number;
  readonly coverage: number;
  readonly evidenceRuns: readonly PushEvidenceRun[];
}): boolean {
  return input.lowerBound >= 0.6 && input.uses >= 5 && input.coverage >= 0.5 && hasCrossValidatedEvidence(input.evidenceRuns);
}

export function shouldAutoMergeWorldSkill(input: {
  readonly effectiveLowerBound: number;
  readonly validatingAgents: number;
  readonly requiredAgents: number;
  readonly regressionVotes: number;
}): boolean {
  return (
    input.effectiveLowerBound >= 0.55 &&
    input.validatingAgents >= input.requiredAgents &&
    input.regressionVotes === 0
  );
}

export function shouldPruneLocalSkill(input: { readonly lowerBound: number; readonly runsSinceLastUse: number }): boolean {
  return input.lowerBound <= 0.3 || input.runsSinceLastUse > 50;
}

export function shouldArchiveWorldSkill(input: {
  readonly regressionVotes: number;
  readonly effectiveLowerBound: number;
}): boolean {
  return input.regressionVotes >= 3 && input.effectiveLowerBound < 0.4;
}

export function shouldHabituate(input: {
  readonly uses: number;
  readonly lowerBound: number;
  readonly rankByUse: number;
}): boolean {
  return input.uses >= 30 && input.lowerBound >= 0.65 && input.rankByUse <= 5;
}

export function shouldPublishTrace(input: {
  readonly runSucceeded: boolean;
  readonly validateScore: number;
  readonly maxSurpriseMagnitude: number;
}): boolean {
  return input.runSucceeded && input.validateScore > 0.7 && input.maxSurpriseMagnitude > 0.4;
}

export function shouldPublishRun(input: { readonly runSucceeded: boolean; readonly userOptedIn: boolean }): boolean {
  return input.runSucceeded && input.userOptedIn;
}
