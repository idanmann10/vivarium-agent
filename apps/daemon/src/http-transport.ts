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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

function latestRunText(status: ReturnType<DaemonServer["status"]>): string {
  if (status.latestRun === undefined) {
    return "None yet";
  }

  const runStatus =
    status.latestRun.success === null ? "running" : status.latestRun.success ? "success" : "blocked";
  const score = status.latestRun.score === null ? "" : `, score ${status.latestRun.score}`;
  return `${status.latestRun.goal} (${runStatus}${score})`;
}

function renderDashboard(daemon: DaemonServer): string {
  const status = daemon.status();
  const statePath = status.statePath ?? "memory-only";
  const latestRun = latestRunText(status);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vivarium Dashboard</title>
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f8f5; color: #20231f; }
      main { width: min(720px, calc(100vw - 32px)); }
      h1 { font-size: 32px; line-height: 1.1; margin: 0 0 12px; letter-spacing: 0; }
      .panel { border: 1px solid #cfd6c8; border-radius: 8px; padding: 24px; background: #fff; box-shadow: 0 12px 40px rgba(20, 28, 16, 0.08); }
      dl { display: grid; grid-template-columns: 150px 1fr; gap: 10px 16px; margin: 20px 0; }
      dt { color: #53604d; }
      dd { margin: 0; font-weight: 650; overflow-wrap: anywhere; }
      form { display: grid; gap: 12px; margin-top: 24px; }
      label { display: grid; gap: 6px; color: #53604d; font-weight: 650; }
      input { width: 100%; box-sizing: border-box; border: 1px solid #cfd6c8; border-radius: 6px; padding: 10px 12px; background: Canvas; color: CanvasText; font: inherit; }
      button { justify-self: start; border: 0; border-radius: 6px; padding: 10px 14px; background: #275e3d; color: #fff; font: inherit; font-weight: 750; cursor: pointer; }
      button:disabled { cursor: progress; opacity: 0.72; }
      output { display: block; min-height: 24px; margin-top: 14px; white-space: pre-wrap; overflow-wrap: anywhere; color: #20231f; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.92em; }
      .links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
      .links span { color: #53604d; font-weight: 700; }
      a { color: #275e3d; font-weight: 700; }
      @media (prefers-color-scheme: dark) {
        body { background: #101410; color: #f2f6ee; }
        .panel { background: #171d17; border-color: #364231; box-shadow: none; }
        dt { color: #acb8a5; }
        input { border-color: #364231; }
        output { color: #f2f6ee; }
        .links span { color: #acb8a5; }
        a { color: #9ad38e; }
      }
    </style>
  </head>
  <body>
    <main class="panel">
      <h1>Vivarium Dashboard</h1>
      <p>Local daemon and memory status.</p>
      <dl>
        <dt>Status</dt><dd>Status: ${escapeHtml(status.status)}</dd>
        <dt>Memory</dt><dd><code>${escapeHtml(statePath)}</code></dd>
        <dt>Runs</dt><dd>Runs: ${status.runs}</dd>
        <dt>Latest run</dt><dd>${escapeHtml(latestRun)}</dd>
        <dt>Confidence</dt><dd>${status.confidenceBuckets} buckets</dd>
      </dl>
      <form id="run-agent-form">
        <label>
          Goal
          <input name="goal" value="build a simple agent end to end" autocomplete="off">
        </label>
        <label>
          Domain
          <input name="domain" value="coding" autocomplete="off">
        </label>
        <button type="submit">Run agent</button>
        <output id="run-agent-result" aria-live="polite"></output>
      </form>
      <div class="links">
        <a href="/status">/status</a>
        <span><code>POST /run</code></span>
      </div>
    </main>
    <script>
      const form = document.getElementById("run-agent-form");
      const result = document.getElementById("run-agent-result");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("button");
        const data = new FormData(form);
        button.disabled = true;
        result.textContent = "Running...";
        try {
          const response = await fetch("/run", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              goal: String(data.get("goal") ?? ""),
              domain: String(data.get("domain") ?? ""),
            }),
          });
          const body = await response.json();
          if (!response.ok) {
            result.textContent = body.error ?? "Run failed";
            return;
          }
          result.textContent = [
            "Status: " + (body.success ? "success" : "failed"),
            "Run ID: " + body.runId,
            "Validation: " + (body.validation?.score ?? "recorded"),
          ].join("\\n");
        } catch {
          result.textContent = "Run failed";
        } finally {
          button.disabled = false;
        }
      });
    </script>
  </body>
</html>`;
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

    if (path === "/") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "method not allowed" }, { status: 405 });
      }
      return htmlResponse(renderDashboard(daemon));
    }

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
