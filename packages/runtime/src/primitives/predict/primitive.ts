import type { Prediction } from "../../../../core/src/index.js";
import type { LocalProvider } from "../../../../providers/src/index.js";

export interface PredictPrimitiveRequest {
  readonly goal: string;
  readonly provider: LocalProvider;
  readonly tool: string;
  readonly workingMemoryNotes?: readonly string[];
}

export interface PredictPrimitivePayload {
  readonly prediction: Prediction;
}

export async function runPredictPrimitive(request: PredictPrimitiveRequest): Promise<PredictPrimitivePayload> {
  const workingMemoryNotes = request.workingMemoryNotes ?? [];
  const input =
    workingMemoryNotes.length === 0
      ? request.goal
      : `${request.goal}\n\nWorking memory:\n${workingMemoryNotes.map((note) => `- ${note}`).join("\n")}`;

  return {
    prediction: {
      about: request.tool,
      expected: await request.provider.complete({ kind: "predict", input }),
      confidence: 0.72,
    },
  };
}
