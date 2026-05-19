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

function latestRunHudText(status: ReturnType<DaemonServer["status"]>): string {
  if (status.latestRun === undefined) {
    return "None yet";
  }

  const runStatus =
    status.latestRun.success === null ? "running" : status.latestRun.success ? "success" : "blocked";
  const score = status.latestRun.score === null ? "" : `, score ${status.latestRun.score}`;
  return `${runStatus}${score}`;
}

function compactPathLabel(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts.at(-1) ?? path;
}

function renderDashboard(daemon: DaemonServer): string {
  const status = daemon.status();
  const statePath = status.statePath ?? "memory-only";
  const latestRun = latestRunText(status);
  const latestRunHud = latestRunHudText(status);
  const stateHud = compactPathLabel(statePath);
  const daemonStatus = escapeHtml(status.status);
  const escapedStatePath = escapeHtml(statePath);
  const escapedLatestRun = escapeHtml(latestRun);
  const escapedLatestRunHud = escapeHtml(latestRunHud);
  const escapedStateHud = escapeHtml(stateHud);
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
        width: min(1540px, calc(100vw - 32px));
        min-height: calc(100vh - 32px);
        margin: 16px auto;
        display: grid;
        grid-template-columns: 224px minmax(0, 1fr);
        gap: 16px;
      }
      .workspace { display: grid; grid-template-rows: auto 1fr; gap: 16px; min-width: 0; }
      .topbar, .panel, .sidebar {
        border: 1px solid rgba(224, 213, 184, 0.18);
        background: rgba(17, 24, 18, 0.84);
        box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(18px);
      }
      .sidebar {
        position: sticky;
        top: 16px;
        align-self: start;
        min-height: calc(100vh - 32px);
        border-radius: 8px;
        padding: 18px;
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 18px;
      }
      .brand-mark {
        width: 38px;
        height: 38px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #8ede92, #d9bd78);
        color: #112016;
        font-weight: 950;
      }
      .brand-stack { display: grid; gap: 10px; }
      .brand-stack strong { color: #fff8df; font-size: 18px; }
      .nav-list { display: grid; gap: 8px; align-content: start; }
      .nav-item {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 10px 12px;
        background: rgba(244, 241, 232, 0.045);
        color: #ded5bd;
        font-size: 13px;
        font-weight: 850;
      }
      .nav-item.active {
        border-color: rgba(142, 222, 146, 0.36);
        background: rgba(79, 143, 91, 0.18);
        color: #c7f6c9;
      }
      .sidebar-foot {
        border-top: 1px solid rgba(224, 213, 184, 0.12);
        padding-top: 14px;
        color: #b8b39f;
        font-size: 12px;
        line-height: 1.45;
      }
      .topbar {
        min-height: 88px;
        border-radius: 8px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .header-copy { display: grid; gap: 4px; min-width: 0; }
      .breadcrumb {
        color: #b8b39f;
        font-size: 12px;
        font-weight: 800;
      }
      .topbar-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }
      .header-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        border: 1px solid rgba(224, 213, 184, 0.14);
        border-radius: 8px;
        padding: 4px;
        background: rgba(244, 241, 232, 0.045);
      }
      .tab-pill,
      .ghost-button {
        min-height: 36px;
        border: 1px solid rgba(224, 213, 184, 0.14);
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 11px;
        background: rgba(244, 241, 232, 0.055);
        color: #ded5bd;
        font-size: 12px;
        font-weight: 850;
        line-height: 1;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
      }
      .tab-pill.active,
      .ghost-button.primary {
        border-color: rgba(142, 222, 146, 0.34);
        background: rgba(79, 143, 91, 0.18);
        color: #c7f6c9;
      }
      .eyebrow {
        margin: 0 0 6px;
        color: #d9bd78;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }
      h1, h2, h3, p { margin-top: 0; }
      h1 { margin-bottom: 0; font-size: clamp(30px, 3.6vw, 48px); line-height: 0.98; letter-spacing: 0; }
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
        grid-template-columns: minmax(280px, 0.95fr) minmax(390px, 1.45fr) minmax(240px, 0.82fr);
        gap: 16px;
        align-items: stretch;
      }
      .dashboard-main { display: grid; gap: 16px; align-content: start; }
      .health-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .health-card {
        min-height: 84px;
        border: 1px solid rgba(224, 213, 184, 0.13);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.052);
      }
      .health-card span,
      .health-card small {
        display: block;
        color: #b8b39f;
        font-size: 11px;
        font-weight: 800;
      }
      .health-card strong {
        display: block;
        margin: 8px 0 4px;
        color: #fff8df;
        font-size: 16px;
        overflow-wrap: anywhere;
      }
      .section-heading {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 12px;
        margin: 2px 0 -4px;
      }
      .section-heading h2 { margin-bottom: 0; font-size: 18px; }
      .section-heading span { color: #b8b39f; font-size: 12px; font-weight: 800; }
      .toolbar-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }
      .toolbar-row span {
        border: 1px solid rgba(224, 213, 184, 0.13);
        border-radius: 999px;
        padding: 7px 10px;
        background: rgba(244, 241, 232, 0.052);
      }
      .section-cards {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .section-card {
        min-height: 126px;
        border: 1px solid rgba(224, 213, 184, 0.15);
        border-radius: 8px;
        padding: 14px;
        background:
          linear-gradient(180deg, rgba(255, 248, 223, 0.07), rgba(255, 248, 223, 0.025)),
          rgba(17, 24, 18, 0.84);
      }
      .section-card span { color: #b8b39f; font-size: 12px; font-weight: 850; }
      .section-card strong { display: block; margin-top: 10px; color: #fff8df; font-size: 24px; line-height: 1; overflow-wrap: anywhere; }
      .section-card p { margin: 10px 0 0; color: #cfc7ae; font-size: 12px; line-height: 1.35; }
      .dashboard-content {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
        gap: 16px;
        align-items: start;
      }
      .primary-stack, .aside-stack { display: grid; gap: 16px; min-width: 0; }
      .world-panel { min-height: 560px; position: relative; padding: 0; }
      .world-panel.featured { min-height: 620px; }
      .chart-panel { min-height: 260px; }
      .run-chart {
        width: 100%;
        height: 180px;
        display: block;
        margin-top: 8px;
      }
      .chart-axis { stroke: rgba(255, 248, 223, 0.12); stroke-width: 1; }
      .chart-grid { stroke: rgba(255, 248, 223, 0.08); stroke-width: 1; }
      .chart-area { fill: rgba(142, 222, 146, 0.12); }
      .chart-line { fill: none; stroke: #8ede92; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
      .chart-dot { fill: #fff8df; stroke: #8ede92; stroke-width: 3; }
      .activity-table-wrap { width: 100%; overflow: auto; }
      .activity-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 620px;
      }
      .activity-table th,
      .activity-table td {
        border-bottom: 1px solid rgba(224, 213, 184, 0.12);
        padding: 12px 10px;
        text-align: left;
        vertical-align: top;
      }
      .activity-table th {
        color: #b8b39f;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .activity-table td { color: #fff8df; font-size: 13px; }
      .status-badge {
        display: inline-flex;
        border: 1px solid rgba(142, 222, 146, 0.26);
        border-radius: 999px;
        padding: 4px 8px;
        color: #c7f6c9;
        background: rgba(79, 143, 91, 0.16);
        font-size: 12px;
        font-weight: 850;
        white-space: nowrap;
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
        align-content: start;
        padding-right: 4px;
      }
      .message {
        border: 1px solid rgba(224, 213, 184, 0.13);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .message.agent { border-color: rgba(126, 220, 147, 0.24); background: rgba(57, 118, 73, 0.13); }
      .message p { margin: 4px 0 0; line-height: 1.35; overflow-wrap: anywhere; }
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
      .primary-button {
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
      .preset-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin: 0 0 14px;
      }
      .preset-button {
        border: 1px solid rgba(224, 213, 184, 0.14);
        border-radius: 8px;
        padding: 10px;
        background: rgba(244, 241, 232, 0.055);
        color: #fff8df;
        cursor: pointer;
        text-align: left;
      }
      .preset-button strong { display: block; margin-bottom: 4px; font-size: 13px; }
      .preset-button span { display: block; color: #b8b39f; font-size: 11px; font-weight: 750; }
      .agent-list { display: grid; gap: 10px; }
      .agent-card {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .agent-card strong { display: block; margin-bottom: 4px; }
      .queue-list { display: grid; gap: 8px; }
      .queue-item {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 11px 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .queue-item strong {
        display: block;
        color: #fff8df;
        font-size: 13px;
        overflow-wrap: anywhere;
      }
      .queue-item span { display: block; color: #b8b39f; font-size: 11px; font-weight: 750; }
      .world-head { padding: 18px 18px 0; }
      .scene-wrap {
        position: relative;
        min-height: 520px;
        border-top: 1px solid rgba(224, 213, 184, 0.1);
        background: #07100d;
      }
      .scene-wrap::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 50% 38%, rgba(142, 222, 146, 0.16), transparent 34%),
          linear-gradient(180deg, rgba(255, 248, 223, 0.04), transparent 38%);
      }
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
        .gateway-shell { grid-template-columns: 1fr; }
        .sidebar {
          position: static;
          min-height: auto;
          grid-template-rows: auto;
        }
        .nav-list { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .gateway-grid,
        .dashboard-content { grid-template-columns: 1fr; }
        .section-cards,
        .health-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .world-panel { min-height: auto; }
      }
      @media (max-width: 680px) {
        .gateway-shell { width: min(100% - 20px, 1480px); margin: 10px auto; }
        .topbar { align-items: flex-start; flex-direction: column; }
        .topbar-actions,
        .header-tabs { width: 100%; justify-content: flex-start; }
        .nav-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .metric-grid,
        .scene-hud,
        .section-cards,
        .health-strip,
        .preset-grid { grid-template-columns: 1fr; }
        #world-scene { height: 420px; }
      }
    </style>
  </head>
  <body>
    <main class="gateway-shell" data-testid="gateway-shell" data-template="shadcn-dashboard-01" data-template-source="https://ui.shadcn.com/blocks">
      <aside class="sidebar" data-testid="gateway-sidebar">
        <div class="brand-stack">
          <div class="brand-mark">V</div>
          <div>
            <p class="eyebrow">Local Runtime</p>
            <strong>Vivarium Gateway</strong>
          </div>
        </div>
        <nav class="nav-list" aria-label="Gateway sections">
          <a class="nav-item active" href="#command">Command Center</a>
          <a class="nav-item" href="#chat">Chat</a>
          <a class="nav-item" href="#agents">Agents</a>
          <a class="nav-item" href="#world">World</a>
          <a class="nav-item" href="#memory">Memory</a>
        </nav>
        <div class="sidebar-foot">
          <strong>Status: ${daemonStatus}</strong><br>
          Local URL: 127.0.0.1:8787<br>
          Zero cloud required.
        </div>
      </aside>
      <section class="workspace" id="command">
        <header class="topbar" data-testid="site-header">
          <div class="header-copy">
            <div class="breadcrumb">Gateway / Command Center</div>
            <p class="eyebrow">Command Center</p>
            <h1>Vivarium Gateway</h1>
          </div>
          <div class="topbar-actions">
            <nav class="header-tabs" data-testid="gateway-tabs" aria-label="Dashboard views">
              <a class="tab-pill active" href="#command">Overview</a>
              <a class="tab-pill" href="#world">World</a>
              <a class="tab-pill" href="#activity">Runs</a>
              <a class="tab-pill" href="#memory">Memory</a>
            </nav>
            <button type="button" class="ghost-button primary" data-scroll-target="chat">New run</button>
            <a class="ghost-button" href="/status">Open status</a>
            <div class="status-pill">Status: ${daemonStatus}</div>
          </div>
        </header>
        <section class="dashboard-main">
          <section class="health-strip" data-testid="health-strip" aria-label="System Health">
            <article class="health-card">
              <span>System Health</span>
              <strong>${daemonStatus}</strong>
              <small>daemon loop</small>
            </article>
            <article class="health-card">
              <span>Model Router</span>
              <strong>local-first</strong>
              <small>provider-ready</small>
            </article>
            <article class="health-card">
              <span>Tool Policy</span>
              <strong>guarded</strong>
              <small>external calls gated</small>
            </article>
            <article class="health-card">
              <span>Storage</span>
              <strong>${escapedStateHud}</strong>
              <small>durable memory</small>
            </article>
          </section>
          <div class="section-heading">
            <div>
              <p class="eyebrow">World Telemetry</p>
              <h2>Operations Overview</h2>
            </div>
            <div class="toolbar-row" data-testid="dashboard-toolbar">
              <span>Live local</span>
              <span>Operator view</span>
              <span>4 agents online</span>
            </div>
          </div>
          <section class="section-cards" data-testid="dashboard-section-cards">
            <article class="section-card">
              <span>Total Runs</span>
              <strong data-live-field="runs">${status.runs}</strong>
              <p>Recorded local agent runs in durable memory.</p>
            </article>
            <article class="section-card">
              <span>Latest Score</span>
              <strong data-live-field="latest-score">${escapedLatestRunHud}</strong>
              <p>Last validation result from the local runtime.</p>
            </article>
            <article class="section-card">
              <span>Confidence</span>
              <strong data-live-field="confidence">${status.confidenceBuckets}</strong>
              <p>Prediction buckets available for Dream consolidation.</p>
            </article>
            <article class="section-card">
              <span>State</span>
              <strong>${escapedStateHud}</strong>
              <p>${escapedStatePath}</p>
            </article>
          </section>
          <div class="dashboard-content">
            <section class="primary-stack">
              <section class="panel world-panel featured" id="world">
                <div class="world-head panel-header">
                  <div>
                    <p class="eyebrow">World View</p>
                    <h2>3D Agent World</h2>
                  </div>
                  <span>4 agents online</span>
                </div>
                <div class="scene-wrap" data-testid="world-canvas-viewport">
                  <canvas id="world-scene" width="960" height="520" aria-label="Vivarium world view"></canvas>
                  <div class="scene-hud">
                    <div class="hud-item"><span>Daemon</span><strong>${daemonStatus}</strong></div>
                    <div class="hud-item"><span>Latest</span><strong data-live-field="latest-hud">${escapedLatestRunHud}</strong></div>
                    <div class="hud-item"><span>State</span><strong>${escapedStateHud}</strong></div>
                  </div>
                </div>
              </section>
              <section class="panel chart-panel" data-testid="run-signal-chart">
                <div class="panel-header">
                  <div>
                    <p class="eyebrow">Pipeline</p>
                    <h2>Run Signal</h2>
                  </div>
                  <span data-live-field="latest-hud">${escapedLatestRunHud}</span>
                </div>
                <svg class="run-chart" viewBox="0 0 640 180" role="img" aria-label="Run signal chart">
                  <line class="chart-grid" x1="24" y1="36" x2="616" y2="36"></line>
                  <line class="chart-grid" x1="24" y1="90" x2="616" y2="90"></line>
                  <line class="chart-grid" x1="24" y1="144" x2="616" y2="144"></line>
                  <line class="chart-axis" x1="24" y1="154" x2="616" y2="154"></line>
                  <path class="chart-area" d="M24 142 C112 126 136 116 184 110 C250 100 286 78 338 82 C412 88 434 48 492 52 C548 56 578 40 616 34 L616 154 L24 154 Z"></path>
                  <path class="chart-line" d="M24 142 C112 126 136 116 184 110 C250 100 286 78 338 82 C412 88 434 48 492 52 C548 56 578 40 616 34"></path>
                  <circle class="chart-dot" cx="24" cy="142" r="5"></circle>
                  <circle class="chart-dot" cx="184" cy="110" r="5"></circle>
                  <circle class="chart-dot" cx="338" cy="82" r="5"></circle>
                  <circle class="chart-dot" cx="492" cy="52" r="5"></circle>
                  <circle class="chart-dot" cx="616" cy="34" r="5"></circle>
                </svg>
              </section>
              <section class="panel" id="activity" data-testid="activity-table">
                <div class="panel-header">
                  <div>
                    <p class="eyebrow">Pipeline</p>
                    <h2>Recent Activity</h2>
                  </div>
                  <span>local runtime</span>
                </div>
                <div class="activity-table-wrap">
                  <table class="activity-table">
                    <thead>
                      <tr>
                        <th>Stage</th>
                        <th>Pipeline</th>
                        <th>Status</th>
                        <th>Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Plan</td><td>Select local skills and traces</td><td><span class="status-badge">ready</span></td><td>Local Agent</td></tr>
                      <tr><td>Predict</td><td>Score likely outcome and risk</td><td><span class="status-badge">ready</span></td><td>Local Agent</td></tr>
                      <tr><td>Execute</td><td>Run deterministic provider action</td><td><span class="status-badge">ready</span></td><td>Tool Runtime</td></tr>
                      <tr><td>Validate</td><td>Record score and confidence bucket</td><td><span class="status-badge">ready</span></td><td>Safety Sentinel</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
            <aside class="aside-stack">
              <section class="panel" id="chat" data-testid="agent-command-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Agent Chat</p>
                <h2>Operator Console</h2>
              </div>
              <a href="/status">/status</a>
            </div>
            <div class="preset-grid" data-testid="agent-presets" aria-label="Agent presets">
              <button type="button" class="preset-button" data-preset-goal="debug a failing local agent run" data-preset-domain="coding"><strong>Debug</strong><span>Trace a runtime issue</span></button>
              <button type="button" class="preset-button" data-preset-goal="ship a simple local agent" data-preset-domain="coding"><strong>Ship</strong><span>Run the release path</span></button>
              <button type="button" class="preset-button" data-preset-goal="research agent world state" data-preset-domain="research"><strong>Research</strong><span>Collect world signals</span></button>
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
                <textarea name="goal" aria-label="Goal" autocomplete="off">build a simple agent end to end</textarea>
              </label>
              <label>
                Domain
                <input name="domain" aria-label="Domain" value="coding" autocomplete="off">
              </label>
              <button class="primary-button" type="submit">Run agent</button>
            </form>
              </section>
              <section class="panel" id="memory">
            <div class="panel-header">
              <h2>World Telemetry</h2>
              <span data-live-field="confidence-label">${status.confidenceBuckets} buckets</span>
            </div>
            <div class="metric-grid">
              <div class="metric"><span>Memory</span><strong>${escapedStatePath}</strong></div>
              <div class="metric"><span>Runs</span><strong data-live-field="runs-label">Runs: ${status.runs}</strong></div>
              <div class="metric"><span>Latest run</span><strong data-live-field="latest-run">${escapedLatestRun}</strong></div>
              <div class="metric"><span>Confidence</span><strong data-live-field="confidence-label">${status.confidenceBuckets} buckets</strong></div>
            </div>
            <div class="endpoint-list">
              <code>/status</code>
              <code>POST /run</code>
              <code>POST /dream</code>
            </div>
              </section>
              <section class="panel" id="agents">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Agent Roster</p>
                <h2>Agent Operations</h2>
              </div>
              <span>runtime crew</span>
            </div>
            <div class="agent-list">
              <article class="agent-card" data-agent-name="Local Agent"><strong>Local Agent</strong><span>Runs deterministic goals through local memory.</span></article>
              <article class="agent-card" data-agent-name="Dream Worker"><strong>Dream Worker</strong><span>Consolidates runs into skills, traces, and identity.</span></article>
              <article class="agent-card" data-agent-name="World Scout"><strong>World Scout</strong><span>Tracks subscribed worlds, skills, and traces.</span></article>
              <article class="agent-card" data-agent-name="Safety Sentinel"><strong>Safety Sentinel</strong><span>Keeps external tools behind policy checks.</span></article>
            </div>
              </section>
              <section class="panel" data-testid="world-queue">
            <div class="panel-header">
              <div>
                <p class="eyebrow">World Queue</p>
                <h2>Queued Work</h2>
              </div>
              <span>live loop</span>
            </div>
            <div class="queue-list">
              <div class="queue-item"><div><strong>Prepare local workspace</strong><span>Tool Runtime</span></div><span class="status-badge">ready</span></div>
              <div class="queue-item"><div><strong>Score next agent run</strong><span>Local Agent</span></div><span class="status-badge">ready</span></div>
              <div class="queue-item"><div><strong>Dream memory update</strong><span>Dream Worker</span></div><span class="status-badge">idle</span></div>
            </div>
              </section>
              <section class="panel">
            <div class="panel-header">
              <h2>Latest Run</h2>
              <span>${daemonStatus}</span>
            </div>
            <div class="metric">
              <span>Run summary</span>
              <strong data-live-field="latest-run">${escapedLatestRun}</strong>
            </div>
              </section>
            </aside>
          </div>
        </section>
      </section>
    </main>
    <script>
      const form = document.getElementById("gateway-chat-form");
      const chatLog = document.getElementById("chat-log");
      const goalInput = form.querySelector('textarea[name="goal"]');
      const domainInput = form.querySelector('input[name="domain"]');
      const presetButtons = document.querySelectorAll("[data-preset-goal]");
      presetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          goalInput.value = button.dataset.presetGoal ?? goalInput.value;
          domainInput.value = button.dataset.presetDomain ?? domainInput.value;
          document.getElementById("chat").scrollIntoView({ behavior: "smooth", block: "start" });
          goalInput.focus();
        });
      });
      document.querySelectorAll("[data-scroll-target]").forEach((button) => {
        button.addEventListener("click", () => {
          const target = document.getElementById(button.dataset.scrollTarget);
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
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
      function latestRunTextFromStatus(latestRun) {
        if (!latestRun) {
          return "None yet";
        }
        const runStatus = latestRun.success === null ? "running" : latestRun.success ? "success" : "blocked";
        const score = latestRun.score === null ? "" : ", score " + latestRun.score;
        return latestRun.goal + " (" + runStatus + score + ")";
      }
      function latestRunHudTextFromStatus(latestRun) {
        if (!latestRun) {
          return "None yet";
        }
        const runStatus = latestRun.success === null ? "running" : latestRun.success ? "success" : "blocked";
        const score = latestRun.score === null ? "" : ", score " + latestRun.score;
        return runStatus + score;
      }
      function setLiveField(name, value) {
        document.querySelectorAll('[data-live-field="' + name + '"]').forEach((element) => {
          element.textContent = value;
        });
      }
      async function refreshGatewayTelemetry() {
        const response = await fetch("/status");
        if (!response.ok) {
          return;
        }
        const status = await response.json();
        const runs = String(status.runs ?? 0);
        const confidence = String(status.confidenceBuckets ?? 0);
        const confidenceLabel = confidence + " buckets";
        const latestRun = latestRunTextFromStatus(status.latestRun);
        const latestHud = latestRunHudTextFromStatus(status.latestRun);
        setLiveField("runs", runs);
        setLiveField("runs-label", "Runs: " + runs);
        setLiveField("latest-score", latestHud);
        setLiveField("latest-hud", latestHud);
        setLiveField("latest-run", latestRun);
        setLiveField("confidence", confidence);
        setLiveField("confidence-label", confidenceLabel);
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
            body.success ? "Run recorded" : "Run failed",
            "Run ID: " + body.runId,
            "Validation: " + (body.validation?.score ?? "recorded"),
          ].join("\\n");
          await refreshGatewayTelemetry();
        } catch {
          pending.textContent = "Run failed";
        } finally {
          button.disabled = false;
        }
      });

      const canvas = document.getElementById("world-scene");
      const ctx = canvas.getContext("2d");
      const agents = [
        { name: "Local Agent", color: "#8ede92", orbit: 0.0, task: "planning" },
        { name: "Dream Worker", color: "#d9bd78", orbit: 1.7, task: "dreaming" },
        { name: "World Scout", color: "#76c7d9", orbit: 3.2, task: "retrieving" },
        { name: "Safety Sentinel", color: "#e59a86", orbit: 4.7, task: "guarding" },
      ];
      const worldTowers = [
        { x: -2, y: -1, floors: 3, color: "#8ede92" },
        { x: 1, y: -2, floors: 2, color: "#76c7d9" },
        { x: 2, y: 1, floors: 4, color: "#d9bd78" },
        { x: -1, y: 2, floors: 2, color: "#e59a86" },
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
      function projectIso(tileX, tileY, width, height) {
        return {
          x: width * 0.5 + (tileX - tileY) * 58,
          y: height * 0.56 + (tileX + tileY) * 29,
        };
      }
      function drawDiamond(x, y, radiusX, radiusY, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x, y - radiusY);
        ctx.lineTo(x + radiusX, y);
        ctx.lineTo(x, y + radiusY);
        ctx.lineTo(x - radiusX, y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
      function drawWorldTower(tower, width, height, tick) {
        const base = projectIso(tower.x, tower.y, width, height);
        drawDiamond(base.x, base.y, 44, 22, "rgba(255, 248, 223, 0.055)", "rgba(255, 248, 223, 0.16)");
        for (let floor = 0; floor < tower.floors; floor += 1) {
          const lift = floor * 16;
          ctx.fillStyle = floor === tower.floors - 1 ? tower.color : "rgba(255, 248, 223, 0.12)";
          ctx.strokeStyle = "rgba(4, 8, 6, 0.42)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(base.x - 26, base.y - lift);
          ctx.lineTo(base.x, base.y - 13 - lift);
          ctx.lineTo(base.x + 26, base.y - lift);
          ctx.lineTo(base.x, base.y + 13 - lift);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.strokeStyle = tower.color;
        ctx.globalAlpha = 0.34 + Math.sin(tick / 28 + tower.x) * 0.14;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y - tower.floors * 16 - 18);
        ctx.lineTo(width * 0.5, height * 0.27);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      function agentPosition(agent, index, width, height, tick) {
        const centerX = width * 0.5;
        const centerY = height * 0.57;
        const radiusX = width * (0.18 + index * 0.035);
        const radiusY = height * (0.09 + index * 0.018);
        const angle = tick / (1500 + index * 360) + agent.orbit;
        return {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
          angle,
        };
      }
      function drawAgentTrail(agent, index, width, height, tick) {
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        for (let step = 0; step < 34; step += 1) {
          const position = agentPosition(agent, index, width, height, tick - step * 70);
          if (step === 0) {
            ctx.moveTo(position.x, position.y);
          } else {
            ctx.lineTo(position.x, position.y);
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      function drawAgent(agent, index, width, height, tick) {
        const position = agentPosition(agent, index, width, height, tick);
        const x = position.x;
        const y = position.y;
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
        const labelX = x + 24;
        const labelY = y - 12 + index * 12;
        const labelWidth = Math.max(ctx.measureText(agent.name).width, ctx.measureText(agent.task).width) + 14;
        ctx.fillStyle = "rgba(5, 10, 7, 0.72)";
        ctx.fillRect(labelX - 6, labelY - 14, labelWidth, 34);
        ctx.fillStyle = "#fff8df";
        ctx.fillText(agent.name, labelX, labelY);
        ctx.fillStyle = "#b8b39f";
        ctx.font = "700 11px ui-sans-serif, system-ui";
        ctx.fillText(agent.task, labelX, labelY + 14);
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
        worldTowers.forEach((tower) => drawWorldTower(tower, width, height, tick));
        agents.forEach((agent, index) => drawAgentTrail(agent, index, width, height, time));
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
