export type DaemonSmokeFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface DaemonSmokeCommandOptions {
  readonly statusUrl?: string;
  readonly fetch?: DaemonSmokeFetch;
}

export type DaemonSmokeCommandResult =
  | {
      readonly ok: true;
      readonly statusUrl: string;
      readonly daemonStatus: "running";
      readonly runs: number;
      readonly confidenceBuckets: number;
    }
  | {
      readonly ok: false;
      readonly statusUrl: string;
      readonly error: string;
    };

const defaultStatusUrl = "http://127.0.0.1:8787/status";

function parseDaemonStatus(statusUrl: string, value: unknown): DaemonSmokeCommandResult {
  const parsed = value as { readonly status?: unknown; readonly runs?: unknown; readonly confidenceBuckets?: unknown };
  if (parsed.status !== "running" || typeof parsed.runs !== "number" || typeof parsed.confidenceBuckets !== "number") {
    return { ok: false, statusUrl, error: "Daemon status response did not include expected metadata" };
  }

  return {
    ok: true,
    statusUrl,
    daemonStatus: parsed.status,
    runs: parsed.runs,
    confidenceBuckets: parsed.confidenceBuckets,
  };
}

export async function daemonSmokeCommand(options: DaemonSmokeCommandOptions = {}): Promise<DaemonSmokeCommandResult> {
  const statusUrl = options.statusUrl ?? defaultStatusUrl;
  const fetcher = options.fetch ?? fetch;

  try {
    const response = await fetcher(statusUrl, { method: "GET" });
    if (!response.ok) {
      return { ok: false, statusUrl, error: `Daemon status request failed with HTTP ${response.status}` };
    }

    return parseDaemonStatus(statusUrl, await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, statusUrl, error: message };
  }
}
