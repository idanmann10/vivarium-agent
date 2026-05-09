import type { Prediction } from "../../../../core/src/index.js";
import type { LocalProvider } from "../../../../providers/src/index.js";

export interface PredictPrimitiveRequest {
  readonly goal: string;
  readonly provider: LocalProvider;
  readonly tool: string;
}

export interface PredictPrimitivePayload {
  readonly prediction: Prediction;
}

export async function runPredictPrimitive(request: PredictPrimitiveRequest): Promise<PredictPrimitivePayload> {
  return {
    prediction: {
      about: request.tool,
      expected: await request.provider.complete({ kind: "predict", input: request.goal }),
      confidence: 0.72,
    },
  };
}
