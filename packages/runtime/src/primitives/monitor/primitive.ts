export interface MonitorPrimitiveRequest {
  readonly observation: unknown;
  readonly forceFailure?: boolean;
}

export interface MonitorPrimitivePayload {
  readonly offTrackScore: number;
  readonly reasons: readonly string[];
}

export function runMonitorPrimitive(request: MonitorPrimitiveRequest): MonitorPrimitivePayload {
  if (request.forceFailure === true || String(request.observation).toLowerCase().includes("failure")) {
    return { offTrackScore: 0.9, reasons: ["forced failure"] };
  }

  return { offTrackScore: 0.1, reasons: [] };
}
