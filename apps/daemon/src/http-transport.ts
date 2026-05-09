import type { DreamDomainStats } from "../../../packages/runtime/src/index.js";
import type { DaemonRunRequest, DaemonServer } from "./server.js";

export interface StartDaemonHttpServerOptions {
  readonly daemon: DaemonServer;
  readonly hostname?: string;
  readonly port?: number;
}

export interface RunningDaemonHttpServer {
  readonly url: string;
  stop(): void;
}

interface ParsedJson {
  readonly ok: true;
  readonly value: unknown;
}

interface InvalidJson {
  readonly ok: false;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init);
}

async function parseJson(request: Request): Promise<ParsedJson | InvalidJson> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRunRequest(value: unknown): value is DaemonRunRequest {
  return isRecord(value) && isNonEmptyString(value.goal) && isNonEmptyString(value.domain);
}

function isDreamDomainStats(value: unknown): value is DreamDomainStats {
  return (
    isRecord(value) &&
    typeof value.runsCompleted === "number" &&
    typeof value.successRate === "number" &&
    typeof value.skillDiversity === "number"
  );
}

function isDreamRequest(value: unknown): value is Readonly<Record<string, DreamDomainStats>> {
  return isRecord(value) && Object.values(value).every(isDreamDomainStats);
}

export function createDaemonFetchHandler(daemon: DaemonServer): (request: Request) => Promise<Response> {
  return async (request) => {
    const path = new URL(request.url).pathname;

    if (path === "/status") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "method not allowed" }, { status: 405 });
      }
      return jsonResponse(daemon.status());
    }

    if (path === "/run") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "method not allowed" }, { status: 405 });
      }
      const body = await parseJson(request);
      if (!body.ok) {
        return jsonResponse({ error: "invalid json" }, { status: 400 });
      }
      if (!isRunRequest(body.value)) {
        return jsonResponse({ error: "invalid run request" }, { status: 400 });
      }
      return jsonResponse(await daemon.run(body.value));
    }

    if (path === "/dream") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "method not allowed" }, { status: 405 });
      }
      const body = await parseJson(request);
      if (!body.ok) {
        return jsonResponse({ error: "invalid json" }, { status: 400 });
      }
      if (!isDreamRequest(body.value)) {
        return jsonResponse({ error: "invalid dream request" }, { status: 400 });
      }
      return jsonResponse(daemon.dream(body.value));
    }

    return jsonResponse({ error: "not found" }, { status: 404 });
  };
}

export function startDaemonHttpServer(options: StartDaemonHttpServerOptions): RunningDaemonHttpServer {
  const hostname = options.hostname ?? "127.0.0.1";
  const server = Bun.serve({
    hostname,
    port: options.port ?? 8787,
    fetch: createDaemonFetchHandler(options.daemon),
  });

  return {
    url: `http://${hostname}:${server.port}`,
    stop() {
      server.stop(true);
    },
  };
}
