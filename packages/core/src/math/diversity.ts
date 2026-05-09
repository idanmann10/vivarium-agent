export interface EpsilonDecisionInput<T> {
  readonly top: readonly T[];
  readonly alternatives: readonly T[];
  readonly epsilon?: number;
  readonly random?: number;
}

export function chooseWithEpsilon<T>({
  top,
  alternatives,
  epsilon = 0.05,
  random = Math.random(),
}: EpsilonDecisionInput<T>): readonly T[] {
  if (epsilon < 0 || epsilon > 1 || random < 0 || random > 1) {
    throw new Error("chooseWithEpsilon expects epsilon and random in [0, 1]");
  }

  if (random >= epsilon || alternatives.length === 0) {
    return top;
  }

  return [alternatives[0] as T, ...top.slice(1)];
}
