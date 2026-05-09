import type { LocalProvider } from "../../../../providers/src/index.js";

export interface ExecutePrimitiveRequest {
  readonly goal: string;
  readonly provider: LocalProvider;
  readonly tool: string;
  readonly forceFailure?: boolean;
}

export interface ExecutePrimitivePayload {
  readonly action: {
    readonly tool: string;
    readonly args: unknown;
  };
  readonly observation: unknown;
}

export async function runExecutePrimitive(request: ExecutePrimitiveRequest): Promise<ExecutePrimitivePayload> {
  return {
    action: { tool: request.tool, args: { goal: request.goal } },
    observation:
      request.forceFailure === true
        ? "Forced failure for recovery test"
        : await request.provider.complete({ kind: "execute", input: request.goal }),
  };
}
