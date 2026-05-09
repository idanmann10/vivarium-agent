export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length === 0) {
    throw new Error("cosineSimilarity expects equal-length non-empty vectors");
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function surpriseMagnitude(predictedEmbedding: readonly number[], actualEmbedding: readonly number[]): number {
  return 1 - cosineSimilarity(predictedEmbedding, actualEmbedding);
}

export function shouldTagSurprise(magnitude: number): boolean {
  return magnitude >= 0.3;
}
