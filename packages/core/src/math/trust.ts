export interface SkillEvidence {
  readonly lowerBound: number;
  readonly uses: number;
}

export function sigmoid(value: number): number {
  return 1 / (1 + Math.E ** -value);
}

export function contributorTrust(evidence: readonly SkillEvidence[]): number {
  const weighted = evidence.reduce((sum, item) => {
    if (item.uses < 0 || item.lowerBound < 0 || item.lowerBound > 1) {
      throw new Error("Trust evidence requires uses >= 0 and lowerBound in [0, 1]");
    }

    return sum + item.lowerBound * Math.log1p(item.uses);
  }, 0);

  return sigmoid(weighted);
}

export interface EffectiveLowerBoundInput {
  readonly lowerBound: number;
  readonly trust: number;
}

export function effectiveLowerBound({ lowerBound, trust }: EffectiveLowerBoundInput): number {
  if (lowerBound < 0 || lowerBound > 1 || trust < 0 || trust > 1) {
    throw new Error("effectiveLowerBound expects lowerBound and trust in [0, 1]");
  }

  return lowerBound * (0.85 + 0.15 * trust);
}
