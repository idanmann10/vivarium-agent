export interface WilsonInput {
  readonly helped: number;
  readonly uses: number;
  readonly z?: number;
}

export function wilsonLowerBound({ helped, uses, z = 1.96 }: WilsonInput): number {
  if (uses <= 0) {
    return 0;
  }

  if (helped < 0 || uses < 0 || helped > uses) {
    throw new Error("Wilson score requires 0 <= helped <= uses");
  }

  const phat = helped / uses;
  const z2 = z * z;
  const denominator = 1 + z2 / uses;
  const center = phat + z2 / (2 * uses);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * uses)) / uses);

  return (center - margin) / denominator;
}
