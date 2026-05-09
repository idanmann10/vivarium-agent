import type { LocalProvider } from "../../../../providers/src/index.js";

export interface ValidatePrimitiveRequest {
  readonly output: unknown;
  readonly provider: LocalProvider;
}

export interface ValidatePrimitivePayload {
  readonly score: number;
  readonly passed: boolean;
  readonly reasons: readonly string[];
}

export async function runValidatePrimitive(request: ValidatePrimitiveRequest): Promise<ValidatePrimitivePayload> {
  return {
    score: 0.8,
    passed: true,
    reasons: [await request.provider.complete({ kind: "validate", input: String(request.output) })],
  };
}
