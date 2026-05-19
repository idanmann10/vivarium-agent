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
  const daemonStatus = escapeHtml(status.status);
  const escapedStatePath = escapeHtml(statePath);
  const escapedLatestRun = escapeHtml(latestRun);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vivarium Gateway</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0c120f;
        color: #f4f1e8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(rgba(244, 241, 232, 0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(244, 241, 232, 0.022) 1px, transparent 1px),
          linear-gradient(140deg, #0a100e 0%, #15180e 46%, #1a1310 100%);
        background-size: 44px 44px, 44px 44px, auto;
      }
      button, input, textarea { font: inherit; letter-spacing: 0; }
      a { color: #9adf9d; font-weight: 750; }
      .gateway-shell {
        width: min(1480px, calc(100vw - 32px));
        min-height: calc(100vh - 32px);
        margin: 16px auto;
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 16px;
      }
      .topbar, .panel {
        border: 1px solid rgba(224, 213, 184, 0.18);
        background: rgba(17, 24, 18, 0.84);
        box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(18px);
      }
      .topbar {
        min-height: 86px;
        border-radius: 8px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .eyebrow {
        margin: 0 0 6px;
        color: #d9bd78;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }
      h1, h2, h3, p { margin-top: 0; }
      h1 { margin-bottom: 0; font-size: clamp(28px, 4vw, 54px); line-height: 0.95; letter-spacing: 0; }
      h2 { margin-bottom: 12px; font-size: 16px; letter-spacing: 0; }
      h3 { margin-bottom: 6px; font-size: 14px; letter-spacing: 0; }
      .status-pill {
        min-width: 176px;
        border: 1px solid rgba(119, 220, 137, 0.34);
        border-radius: 999px;
        padding: 10px 14px;
        background: rgba(67, 132, 82, 0.18);
        color: #a8ebb2;
        font-weight: 850;
        text-align: center;
      }
      .gateway-grid {
        display: grid;
        grid-template-columns: minmax(340px, 0.95fr) minmax(460px, 1.35fr) minmax(320px, 0.85fr);
        gap: 16px;
        align-items: stretch;
      }
      .column { display: grid; gap: 16px; align-content: start; }
      .panel { border-radius: 8px; padding: 18px; overflow: hidden; }
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }
      .metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .metric {
        min-height: 76px;
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .metric span, .agent-card span, .message-role { color: #b8b39f; font-size: 12px; font-weight: 750; }
      .metric strong { display: block; margin-top: 6px; color: #fff8df; font-size: 18px; overflow-wrap: anywhere; }
      .chat-log {
        min-height: 280px;
        max-height: 420px;
        overflow: auto;
        display: grid;
        gap: 10px;
        padding-right: 4px;
      }
      .message {
        border: 1px solid rgba(224, 213, 184, 0.13);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .message.agent { border-color: rgba(126, 220, 147, 0.24); background: rgba(57, 118, 73, 0.13); }
      .message p { margin: 4px 0 0; overflow-wrap: anywhere; }
      form { display: grid; gap: 10px; margin-top: 14px; }
      label { display: grid; gap: 6px; color: #c9c0a5; font-weight: 800; }
      textarea, input {
        width: 100%;
        border: 1px solid rgba(224, 213, 184, 0.22);
        border-radius: 8px;
        padding: 10px 12px;
        background: rgba(4, 8, 6, 0.72);
        color: #fff8df;
      }
      textarea { min-height: 92px; resize: vertical; }
      button {
        justify-self: start;
        border: 0;
        border-radius: 8px;
        padding: 11px 16px;
        background: linear-gradient(135deg, #8ede92, #d9bd78);
        color: #122016;
        font-weight: 900;
        cursor: pointer;
      }
      button:disabled { cursor: progress; opacity: 0.72; }
      .agent-list { display: grid; gap: 10px; }
      .agent-card {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .agent-card strong { display: block; margin-bottom: 4px; }
      .world-panel { min-height: 640px; position: relative; padding: 0; }
      .world-head { padding: 18px 18px 0; }
      .scene-wrap { position: relative; min-height: 520px; }
      #world-scene { width: 100%; height: 520px; display: block; }
      .scene-hud {
        position: absolute;
        inset: auto 16px 16px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .hud-item {
        border: 1px solid rgba(244, 241, 232, 0.14);
        border-radius: 8px;
        padding: 10px;
        background: rgba(10, 16, 14, 0.78);
      }
      .hud-item span { display: block; color: #b8b39f; font-size: 11px; font-weight: 800; }
      .hud-item strong { display: block; margin-top: 4px; color: #fff8df; font-size: 13px; overflow-wrap: anywhere; }
      .endpoint-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
      .endpoint-list code {
        border: 1px solid rgba(224, 213, 184, 0.14);
        border-radius: 999px;
        padding: 7px 10px;
        background: rgba(244, 241, 232, 0.055);
        font-size: 12px;
      }
      @media (max-width: 1120px) {
        .gateway-grid { grid-template-columns: 1fr; }
        .world-panel { min-height: auto; }
      }
      @media (max-width: 680px) {
        .gateway-shell { width: min(100% - 20px, 1480px); margin: 10px auto; }
        .topbar { align-items: flex-start; flex-direction: column; }
        .metric-grid, .scene-hud { grid-template-columns: 1fr; }
        #world-scene { height: 420px; }
      }
    </style>
  </head>
  <body>
    <main class="gateway-shell" data-testid="gateway-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Local Runtime Gateway</p>
          <h1>Vivarium Gateway</h1>
        </div>
        <div class="status-pill">Status: ${daemonStatus}</div>
      </header>
      <div class="gateway-grid">
        <section class="column">
          <section class="panel">
            <div class="panel-header">
              <h2>Agent Chat</h2>
              <a href="/status">/status</a>
            </div>
            <div id="chat-log" class="chat-log" aria-live="polite">
              <article class="message agent">
                <span class="message-role">Vivarium</span>
                <p>Local memory is online. Goal runs are recorded to the daemon state.</p>
              </article>
              <article class="message">
                <span class="message-role">Operator</span>
                <p>build a simple agent end to end</p>
              </article>
            </div>
            <form id="gateway-chat-form">
              <label>
                Goal
                <textarea name="goal" autocomplete="off">build a simple agent end to end</textarea>
              </label>
              <label>
                Domain
                <input name="domain" value="coding" autocomplete="off">
              </label>
              <button type="submit">Run agent</button>
            </form>
          </section>
          <section class="panel">
            <div class="panel-header">
              <h2>World Telemetry</h2>
              <span>${status.confidenceBuckets} buckets</span>
            </div>
            <div class="metric-grid">
              <div class="metric"><span>Memory</span><strong>${escapedStatePath}</strong></div>
              <div class="metric"><span>Runs</span><strong>Runs: ${status.runs}</strong></div>
              <div class="metric"><span>Latest run</span><strong>${escapedLatestRun}</strong></div>
              <div class="metric"><span>Confidence</span><strong>${status.confidenceBuckets} buckets</strong></div>
            </div>
            <div class="endpoint-list">
              <code>/status</code>
              <code>POST /run</code>
              <code>POST /dream</code>
            </div>
          </section>
        </section>
        <section class="panel world-panel">
          <div class="world-head panel-header">
            <div>
              <p class="eyebrow">Live Local World</p>
              <h2>World View</h2>
            </div>
            <span>4 agents online</span>
          </div>
          <div class="scene-wrap">
            <canvas id="world-scene" width="960" height="520" aria-label="Vivarium world view"></canvas>
            <div class="scene-hud">
              <div class="hud-item"><span>Daemon</span><strong>${daemonStatus}</strong></div>
              <div class="hud-item"><span>Latest</span><strong>${escapedLatestRun}</strong></div>
              <div class="hud-item"><span>State</span><strong>${escapedStatePath}</strong></div>
            </div>
          </div>
        </section>
        <section class="column">
          <section class="panel">
            <div class="panel-header">
              <h2>Agent Roster</h2>
              <span>runtime crew</span>
            </div>
            <div class="agent-list">
              <article class="agent-card"><strong>Local Agent</strong><span>Runs deterministic goals through local memory.</span></article>
              <article class="agent-card"><strong>Dream Worker</strong><span>Consolidates runs into skills, traces, and identity.</span></article>
              <article class="agent-card"><strong>World Scout</strong><span>Tracks subscribed worlds, skills, and traces.</span></article>
              <article class="agent-card"><strong>Safety Sentinel</strong><span>Keeps external tools behind policy checks.</span></article>
            </div>
          </section>
          <section class="panel">
            <div class="panel-header">
              <h2>Latest Run</h2>
              <span>${daemonStatus}</span>
            </div>
            <div class="metric">
              <span>Run summary</span>
              <strong>${escapedLatestRun}</strong>
            </div>
          </section>
        </section>
      </div>
    </main>
    <script>
      const form = document.getElementById("gateway-chat-form");
      const chatLog = document.getElementById("chat-log");
      function addMessage(kind, role, text) {
        const message = document.createElement("article");
        message.className = "message " + kind;
        const roleEl = document.createElement("span");
        roleEl.className = "message-role";
        roleEl.textContent = role;
        const textEl = document.createElement("p");
        textEl.textContent = text;
        message.append(roleEl, textEl);
        chatLog.append(message);
        chatLog.scrollTop = chatLog.scrollHeight;
        return textEl;
      }
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("button");
        const data = new FormData(form);
        const goal = String(data.get("goal") ?? "");
        const domain = String(data.get("domain") ?? "");
        button.disabled = true;
        addMessage("", "Operator", goal);
        const pending = addMessage("agent", "Vivarium", "Running local agent...");
        try {
          const response = await fetch("/run", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              goal,
              domain,
            }),
          });
          const body = await response.json();
          if (!response.ok) {
            pending.textContent = body.error ?? "Run failed";
            return;
          }
          pending.textContent = [
            "Status: " + (body.success ? "success" : "failed"),
            "Run ID: " + body.runId,
            "Validation: " + (body.validation?.score ?? "recorded"),
          ].join("\\n");
        } catch {
          pending.textContent = "Run failed";
        } finally {
          button.disabled = false;
        }
      });

      const canvas = document.getElementById("world-scene");
      const ctx = canvas.getContext("2d");
      const agents = [
        { name: "Local Agent", color: "#8ede92", orbit: 0.0 },
        { name: "Dream Worker", color: "#d9bd78", orbit: 1.7 },
        { name: "World Scout", color: "#76c7d9", orbit: 3.2 },
        { name: "Safety Sentinel", color: "#e59a86", orbit: 4.7 },
      ];
      function resizeWorld() {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        const width = Math.max(640, Math.floor(rect.width));
        const height = Math.max(380, Math.floor(rect.height));
        if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
          canvas.width = width * ratio;
          canvas.height = height * ratio;
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        return { width, height };
      }
      function drawGrid(width, height, tick) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(216, 194, 128, 0.16)";
        for (let x = -width; x < width * 2; x += 54) {
          ctx.beginPath();
          ctx.moveTo(x + (tick % 54), height * 0.46);
          ctx.lineTo(x + width * 0.48 + (tick % 54), height * 0.92);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(130, 220, 147, 0.16)";
        for (let x = 0; x < width * 2; x += 54) {
          ctx.beginPath();
          ctx.moveTo(x - (tick % 54), height * 0.46);
          ctx.lineTo(x - width * 0.48 - (tick % 54), height * 0.92);
          ctx.stroke();
        }
      }
      function drawAgent(agent, index, width, height, tick) {
        const centerX = width * 0.5;
        const centerY = height * 0.57;
        const radiusX = width * (0.18 + index * 0.035);
        const radiusY = height * (0.09 + index * 0.018);
        const angle = tick / (1500 + index * 360) + agent.orbit;
        const x = centerX + Math.cos(angle) * radiusX;
        const y = centerY + Math.sin(angle) * radiusY;
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.beginPath();
        ctx.ellipse(x, y + 18, 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        const gradient = ctx.createRadialGradient(x - 5, y - 8, 4, x, y, 28);
        gradient.addColorStop(0, "#fff8df");
        gradient.addColorStop(0.34, agent.color);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.12)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#fff8df";
        ctx.font = "700 12px ui-sans-serif, system-ui";
        ctx.fillText(agent.name, x + 24, y + 4);
      }
      function drawWorld(time) {
        const size = resizeWorld();
        const width = size.width;
        const height = size.height;
        const tick = time / 32;
        ctx.clearRect(0, 0, width, height);
        const background = ctx.createLinearGradient(0, 0, width, height);
        background.addColorStop(0, "#0d1712");
        background.addColorStop(0.55, "#172313");
        background.addColorStop(1, "#251812");
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "rgba(142, 222, 146, 0.08)";
        ctx.beginPath();
        ctx.ellipse(width * 0.5, height * 0.58, width * 0.36, height * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        drawGrid(width, height, tick);
        agents.forEach((agent, index) => drawAgent(agent, index, width, height, time));
        requestAnimationFrame(drawWorld);
      }
      requestAnimationFrame(drawWorld);
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
