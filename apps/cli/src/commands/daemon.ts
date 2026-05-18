import { renderVivariumGlobe } from "./branding.js";

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
      readonly statePath?: string;
      readonly runs: number;
      readonly confidenceBuckets: number;
      readonly latestRun?: {
        readonly id: string;
        readonly goal: string;
        readonly domain: string;
        readonly success: boolean | null;
        readonly score: number | null;
      };
    }
  | {
      readonly ok: false;
      readonly statusUrl: string;
      readonly error: string;
    };

const defaultStatusUrl = "http://127.0.0.1:8787/status";

function parseDaemonStatus(statusUrl: string, value: unknown): DaemonSmokeCommandResult {
  const parsed = value as {
    readonly status?: unknown;
    readonly statePath?: unknown;
    readonly runs?: unknown;
    readonly confidenceBuckets?: unknown;
    readonly latestRun?: unknown;
  };
  if (parsed.status !== "running" || typeof parsed.runs !== "number" || typeof parsed.confidenceBuckets !== "number") {
    return { ok: false, statusUrl, error: "Daemon status response did not include expected metadata" };
  }
  const latestRun = parsed.latestRun as
    | {
        readonly id?: unknown;
        readonly goal?: unknown;
        readonly domain?: unknown;
        readonly success?: unknown;
        readonly score?: unknown;
      }
    | undefined;
  const parsedLatestRun =
    latestRun !== undefined &&
    typeof latestRun.id === "string" &&
    typeof latestRun.goal === "string" &&
    typeof latestRun.domain === "string" &&
    (typeof latestRun.success === "boolean" || latestRun.success === null) &&
    (typeof latestRun.score === "number" || latestRun.score === null)
      ? {
          id: latestRun.id,
          goal: latestRun.goal,
          domain: latestRun.domain,
          success: latestRun.success,
          score: latestRun.score,
        }
      : undefined;

  return {
    ok: true,
    statusUrl,
    daemonStatus: parsed.status,
    ...(typeof parsed.statePath === "string" && parsed.statePath.length > 0
      ? { statePath: parsed.statePath }
      : {}),
    runs: parsed.runs,
    confidenceBuckets: parsed.confidenceBuckets,
    ...(parsedLatestRun === undefined ? {} : { latestRun: parsedLatestRun }),
  };
}

function latestRunLine(result: Extract<DaemonSmokeCommandResult, { ok: true }>): string[] {
  if (result.latestRun === undefined) {
    return [];
  }

  const runStatus = result.latestRun.success === null ? "running" : result.latestRun.success ? "success" : "blocked";
  const score = result.latestRun.score === null ? "" : `, score ${result.latestRun.score}`;
  return [`Latest run: ${result.latestRun.goal} (${runStatus}${score})`];
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

export function renderDaemonSmokeCommandResult(result: DaemonSmokeCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Daemon Smoke",
    "---------------------",
    `Status: ${result.ok ? "ok" : "blocked"}`,
    `Status URL: ${result.statusUrl}`,
    ...(result.ok
      ? [
          `Daemon: ${result.daemonStatus}`,
          ...(result.statePath === undefined ? [] : [`Memory: ${result.statePath}`]),
          `Runs: ${result.runs}`,
          ...latestRunLine(result),
          `Confidence buckets: ${result.confidenceBuckets}`,
          "",
          "Next commands:",
          "  vivarium dashboard",
          "  vivarium status",
        ]
      : [
          `Error: ${result.error}`,
          "",
          "Next command:",
          "  Start the daemon, then rerun daemon smoke.",
        ]),
    "",
  ].join("\n");
}
