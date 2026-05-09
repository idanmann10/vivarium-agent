import type { LocalProvider } from "../../../../providers/src/index.js";
import type { MonitorPrimitivePayload } from "../monitor/index.js";

export interface RecoverPrimitiveRequest {
  readonly goal: string;
  readonly provider: LocalProvider;
  readonly signal: MonitorPrimitivePayload;
}

export interface RecoverPrimitivePayload {
  readonly decision: "replan" | "narrow" | "escalate" | "abort";
  readonly reason: string;
}

export async function runRecoverPrimitive(request: RecoverPrimitiveRequest): Promise<RecoverPrimitivePayload> {
  return {
    decision: request.signal.offTrackScore > 0.6 ? "replan" : "narrow",
    reason: await request.provider.complete({ kind: "recover", input: request.goal }),
  };
}
