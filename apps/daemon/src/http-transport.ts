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

type DashboardStatus = ReturnType<DaemonServer["status"]>;

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatRunState(success: boolean | null): string {
  if (success === null) {
    return "running";
  }

  return success ? "success" : "blocked";
}

function formatScore(score: number | null): string {
  return score === null ? "recorded" : String(score);
}

function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function renderRecentRunRows(runs: DashboardStatus["recentRuns"]): string {
  if (runs.length === 0) {
    return `<tr><td>Waiting</td><td>No local runs yet</td><td><span class="status-badge muted">idle</span></td><td>Local Agent</td></tr>`;
  }

  return runs
    .map((run) => {
      const escapedGoal = escapeHtml(run.goal);
      const escapedDomain = escapeHtml(run.domain);
      const runState = formatRunState(run.success);
      return `<tr><td>${escapedDomain}</td><td>${escapedGoal}</td><td><span class="status-badge">${runState}</span></td><td>score ${formatScore(run.score)}</td></tr>`;
    })
    .join("");
}

function renderDomainCards(domains: DashboardStatus["domains"]): string {
  if (domains.length === 0) {
    return `<article class="mission-card"><strong>coding</strong><span>No local runs yet. Start with the agent chat.</span></article>`;
  }

  return domains
    .map((domain) => {
      const latestGoal = domain.latestGoal ?? "No recent goal";
      return `<article class="mission-card"><strong>${escapeHtml(domain.name)}</strong><span>${domain.runs} runs, ${domain.skills} skills, ${formatPercent(domain.successRate)} success. ${escapeHtml(latestGoal)}</span></article>`;
    })
    .join("");
}

function renderWorldQueue(status: DashboardStatus): string {
  const queue = [
    {
      title: "Prepare local workspace",
      owner: "Tool Runtime",
      status: "ready",
    },
    {
      title: status.latestRun?.goal ?? "Run the first local goal",
      owner: "Local Agent",
      status: status.latestRun === undefined ? "idle" : formatRunState(status.latestRun.success),
    },
    {
      title: `${status.skills.candidates} candidate skills`,
      owner: "Dream Worker",
      status: status.skills.candidates > 0 ? "review" : "idle",
    },
    {
      title: `${status.memory.publishableArtifacts} publishable artifacts`,
      owner: "World Scout",
      status: status.memory.publishableArtifacts > 0 ? "queued" : "clear",
    },
  ];

  return queue
    .map(
      (item) =>
        `<div class="queue-item"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.owner)}</span></div><span class="status-badge">${escapeHtml(item.status)}</span></div>`,
    )
    .join("");
}

function renderSessionCards(status: DashboardStatus): string {
  const latestState = status.latestRun === undefined ? "idle" : formatRunState(status.latestRun.success);
  const sessions = [
    {
      label: "Active Session",
      value: status.latestRun?.goal ?? "build a simple agent end to end",
      detail: latestState,
    },
    {
      label: "Memory Layer",
      value: `${status.memory.semanticFacts} facts`,
      detail: `${status.confidenceBuckets} confidence buckets`,
    },
    {
      label: "Skill Runtime",
      value: `${status.skills.promoted}/${status.skills.total}`,
      detail: `${status.skills.candidates} candidates`,
    },
  ];

  return sessions
    .map(
      (session) =>
        `<article class="session-card"><span>${escapeHtml(session.label)}</span><strong>${escapeHtml(session.value)}</strong><small>${escapeHtml(session.detail)}</small></article>`,
    )
    .join("");
}

function renderAgentLoadout(status: DashboardStatus): string {
  const agents = [
    {
      label: "Planner",
      name: "Local Agent",
      metric: `${status.runs} runs`,
      body: status.latestRun?.goal ?? "Ready to run the first local goal.",
    },
    {
      label: "Dream",
      name: "Dream Worker",
      metric: `${status.skills.promoted}/${status.skills.total} promoted`,
      body: `${status.skills.candidates} candidates and ${status.skills.habitual} habitual skills in memory.`,
    },
    {
      label: "World",
      name: "World Scout",
      metric: `${status.domains.length} domains`,
      body: `${status.memory.traceCandidates} trace candidates and ${status.memory.publishableArtifacts} publishables queued.`,
    },
    {
      label: "Safety",
      name: "Safety Sentinel",
      metric: "guarded",
      body: `${status.memory.antiPatternCandidates} anti-pattern candidates watched before external tools.`,
    },
  ];

  return agents
    .map(
      (agent) =>
        `<article class="loadout-card" data-agent-name="${escapeHtml(agent.name)}"><span>${escapeHtml(agent.label)}</span><strong>${escapeHtml(agent.name)}</strong><p><b>${escapeHtml(agent.metric)}</b> ${escapeHtml(agent.body)}</p></article>`,
    )
    .join("");
}

function renderAgentDirectoryRows(status: DashboardStatus): string {
  const latestState = status.latestRun === undefined ? "idle" : formatRunState(status.latestRun.success);
  const agents = [
    {
      initials: "LA",
      name: "Local Agent",
      lane: "Planning",
      status: latestState,
      queue: status.latestRun?.goal ?? "first local goal",
      skill: `${status.runs} runs`,
    },
    {
      initials: "DW",
      name: "Dream Worker",
      lane: "Memory",
      status: status.confidenceBuckets > 0 ? "consolidating" : "idle",
      queue: `${status.confidenceBuckets} buckets`,
      skill: `${status.skills.promoted} promoted`,
    },
    {
      initials: "WS",
      name: "World Scout",
      lane: "World",
      status: status.domains.length > 0 ? "mapping" : "standby",
      queue: `${status.domains.length} domains`,
      skill: `${status.memory.publishableArtifacts} publishable`,
    },
    {
      initials: "SS",
      name: "Safety Sentinel",
      lane: "Guardrail",
      status: "guarded",
      queue: `${status.memory.antiPatternCandidates} watched`,
      skill: "policy",
    },
  ];

  return agents
    .map(
      (agent) =>
        `<tr><td><div class="roster-agent"><span class="roster-avatar">${escapeHtml(agent.initials)}</span><div><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.lane)}</small></div></div></td><td><span class="status-badge">${escapeHtml(agent.status)}</span></td><td>${escapeHtml(agent.queue)}</td><td>${escapeHtml(agent.skill)}</td></tr>`,
    )
    .join("");
}

function renderAgentStatusBoard(status: DashboardStatus): string {
  const latestState = status.latestRun === undefined ? "idle" : formatRunState(status.latestRun.success);
  const agents = [
    {
      initials: "LA",
      role: "Planner",
      name: "Local Agent",
      state: latestState,
      detail: status.latestRun?.goal ?? "Ready to build the first local agent.",
      progress: status.latestRun === undefined ? 24 : 86,
      color: "#2563eb",
    },
    {
      initials: "DW",
      role: "Memory",
      name: "Dream Worker",
      state: status.confidenceBuckets > 0 ? "consolidating" : "waiting",
      detail: `${status.confidenceBuckets} confidence buckets, ${status.skills.candidates} candidates.`,
      progress: Math.min(100, 32 + status.confidenceBuckets * 18 + status.skills.candidates * 6),
      color: "#7c3aed",
    },
    {
      initials: "WS",
      role: "World",
      name: "World Scout",
      state: status.domains.length > 0 ? "mapping" : "standby",
      detail: `${status.domains.length} domains and ${status.memory.publishableArtifacts} publishables.`,
      progress: Math.min(100, 30 + status.domains.length * 16 + status.memory.publishableArtifacts * 8),
      color: "#0891b2",
    },
    {
      initials: "SS",
      role: "Safety",
      name: "Safety Sentinel",
      state: "guarded",
      detail: `${status.memory.antiPatternCandidates} anti-pattern candidates watched.`,
      progress: 92,
      color: "#ea580c",
    },
  ];

  return agents
    .map(
      (agent) =>
        `<article class="party-card" style="--agent-color: ${agent.color}; --agent-progress: ${agent.progress}%"><div class="party-avatar">${escapeHtml(agent.initials)}</div><div class="party-copy"><span>${escapeHtml(agent.role)}</span><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.detail)}</small></div><div class="party-state"><span class="status-badge">${escapeHtml(agent.state)}</span><div class="energy-track"><i></i></div></div></article>`,
    )
    .join("");
}

function renderLiveRunStream(status: DashboardStatus): string {
  const latest = status.latestRun;
  const stages = [
    {
      stage: "Plan",
      owner: "Local Agent",
      detail: latest?.goal ?? "Waiting for the first goal.",
      state: latest === undefined ? "idle" : "ready",
    },
    {
      stage: "Predict",
      owner: "Provider Router",
      detail: latest === undefined ? "Local deterministic profile is ready." : `Domain ${latest.domain}.`,
      state: latest === undefined ? "idle" : "ready",
    },
    {
      stage: "Execute",
      owner: "Tool Belt",
      detail: latest === undefined ? "Self tools are staged." : `Run ${latest.id}.`,
      state: latest === undefined ? "idle" : formatRunState(latest.success),
    },
    {
      stage: "Validate",
      owner: "Safety Sentinel",
      detail: latest === undefined ? "Score appears here after a run." : `Score ${formatScore(latest.score)}.`,
      state: latest === undefined ? "idle" : latest.success === false ? "blocked" : "recorded",
    },
  ];

  return stages
    .map(
      (stage) =>
        `<div class="stream-row"><span class="stream-dot"></span><div><strong>${escapeHtml(stage.stage)}</strong><small>${escapeHtml(stage.detail)}</small></div><span>${escapeHtml(stage.owner)}</span><b>${escapeHtml(stage.state)}</b></div>`,
    )
    .join("");
}

function renderAgentBuilder(status: DashboardStatus): string {
  const latestState = status.latestRun === undefined ? "ready" : formatRunState(status.latestRun.success);
  const builderSteps = [
    {
      label: "Create agent",
      title: status.memory.identityName ?? "local-agent",
      detail: "Local identity, durable memory, and deterministic provider are staged.",
      state: "ready",
    },
    {
      label: "Pick skills",
      title: `${status.skills.promoted}/${status.skills.total} promoted`,
      detail: `${status.skills.habitual} habitual skills and ${status.skills.candidates} candidates available.`,
      state: status.skills.total > 0 ? "loaded" : "seed",
    },
    {
      label: "Run locally",
      title: status.latestRun?.goal ?? "build a simple agent end to end",
      detail: status.latestRun === undefined ? "Submit a goal in chat to produce a run trace." : `Last run ${status.latestRun.id}.`,
      state: latestState,
    },
    {
      label: "Review trace",
      title: status.latestRun?.score === null || status.latestRun === undefined ? "waiting for score" : `score ${status.latestRun.score}`,
      detail: `${status.memory.traceCandidates} trace candidates and ${status.confidenceBuckets} confidence buckets.`,
      state: status.latestRun === undefined ? "idle" : "recorded",
    },
  ];

  return builderSteps
    .map(
      (step, index) =>
        `<article class="builder-step"><span class="step-index">${index + 1}</span><div><small>${escapeHtml(step.label)}</small><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.detail)}</p></div><b>${escapeHtml(step.state)}</b></article>`,
    )
    .join("");
}

function renderOperationsFeed(status: DashboardStatus): string {
  const latest = status.latestRun;
  const feed = [
    {
      label: "Runtime",
      title: "Daemon online",
      detail: `Status ${status.status}, memory ${compactPathLabel(status.statePath ?? "memory-only")}.`,
      state: "live",
    },
    {
      label: "Agent",
      title: latest?.goal ?? "No local run yet",
      detail: latest === undefined ? "Chat is ready to start the first goal." : `Run ${latest.id} in ${latest.domain}.`,
      state: latest === undefined ? "idle" : formatRunState(latest.success),
    },
    {
      label: "Dream",
      title: status.confidenceBuckets > 0 ? "Confidence buckets ready" : "Dream waiting",
      detail: `${status.skills.candidates} candidates, ${status.skills.archived} archived, ${status.skills.habitual} habitual.`,
      state: status.confidenceBuckets > 0 ? "ready" : "standby",
    },
    {
      label: "World",
      title: `${status.domains.length} active domains`,
      detail: `${status.memory.publishableArtifacts} publishables, ${status.memory.semanticFacts} facts.`,
      state: status.domains.length > 0 ? "mapped" : "empty",
    },
  ];

  return feed
    .map(
      (item) =>
        `<div class="feed-item"><span>${escapeHtml(item.label)}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div><b>${escapeHtml(item.state)}</b></div>`,
    )
    .join("");
}

function renderActivityLanes(status: DashboardStatus): string {
  const latestState = status.latestRun === undefined ? "idle" : formatRunState(status.latestRun.success);
  const lanes = [
    {
      label: "Plan",
      title: "Local Agent",
      detail: status.latestRun?.goal ?? "Waiting for a goal.",
      state: latestState,
      count: status.runs,
    },
    {
      label: "Memory",
      title: "Dream Worker",
      detail: `${status.skills.candidates} candidates, ${status.skills.habitual} habitual skills.`,
      state: status.confidenceBuckets > 0 ? "consolidating" : "standby",
      count: status.confidenceBuckets,
    },
    {
      label: "World",
      title: "World Scout",
      detail: `${status.domains.length} domains mapped, ${status.memory.publishableArtifacts} publishables.`,
      state: status.domains.length > 0 ? "mapping" : "standby",
      count: status.domains.length,
    },
    {
      label: "Safety",
      title: "Safety Sentinel",
      detail: `${status.memory.antiPatternCandidates} anti-pattern candidates watched.`,
      state: "guarded",
      count: status.memory.antiPatternCandidates,
    },
  ];

  return lanes
    .map(
      (lane) =>
        `<article class="lane-card"><div><span>${escapeHtml(lane.label)}</span><strong>${escapeHtml(lane.title)}</strong><p>${escapeHtml(lane.detail)}</p></div><b>${escapeHtml(lane.state)}</b><small>${lane.count}</small></article>`,
    )
    .join("");
}

function renderDashboard(daemon: DaemonServer, localUrl: string): string {
  const status = daemon.status();
  const statePath = status.statePath ?? "memory-only";
  const latestRun = latestRunText(status);
  const latestRunHud = latestRunHudText(status);
  const stateHud = compactPathLabel(statePath);
  const agentCount = status.status === "running" ? 4 : 0;
  const dreamSummary =
    status.confidenceBuckets > 0
      ? `${status.confidenceBuckets} confidence buckets ready`
      : "No dream cycle yet";
  const daemonStatus = escapeHtml(status.status);
  const escapedStatePath = escapeHtml(statePath);
  const escapedLatestRun = escapeHtml(latestRun);
  const escapedLatestRunHud = escapeHtml(latestRunHud);
  const escapedStateHud = escapeHtml(stateHud);
  const escapedLocalUrl = escapeHtml(localUrl);
  const escapedAgentCount = escapeHtml(String(agentCount));
  const escapedDreamSummary = escapeHtml(dreamSummary);
  const dashboardStatusJson = jsonForScript(status);
  const escapedSkillPromoted = escapeHtml(String(status.skills.promoted));
  const escapedSkillTotal = escapeHtml(String(status.skills.total));
  const escapedMemoryFacts = escapeHtml(String(status.memory.semanticFacts));
  const escapedDomainCount = escapeHtml(String(status.domains.length));
  const escapedPublishableCount = escapeHtml(String(status.memory.publishableArtifacts));
  const escapedIdentityName = escapeHtml(status.memory.identityName ?? "local-agent");
  const domainCards = renderDomainCards(status.domains);
  const recentRunRows = renderRecentRunRows(status.recentRuns);
  const worldQueue = renderWorldQueue(status);
  const sessionCards = renderSessionCards(status);
  const agentLoadout = renderAgentLoadout(status);
  const agentDirectoryRows = renderAgentDirectoryRows(status);
  const agentStatusBoard = renderAgentStatusBoard(status);
  const liveRunStream = renderLiveRunStream(status);
  const agentBuilder = renderAgentBuilder(status);
  const operationsFeed = renderOperationsFeed(status);
  const activityLanes = renderActivityLanes(status);
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
        overflow-x: hidden;
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
        grid-template-rows: auto auto minmax(0, 1fr) auto auto;
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
      .nav-group-title {
        grid-column: 1 / -1;
        margin-top: 6px;
        color: #8f8a78;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .nav-item {
        min-width: 0;
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(244, 241, 232, 0.045);
        color: #ded5bd;
        font-size: 13px;
        font-weight: 850;
        text-decoration: none;
      }
      .nav-glyph {
        width: 26px;
        height: 26px;
        border-radius: 8px;
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        background: rgba(244, 241, 232, 0.07);
        color: #d9bd78;
        font-size: 11px;
        font-weight: 950;
      }
      .nav-item.active {
        border-color: rgba(142, 222, 146, 0.36);
        background: rgba(79, 143, 91, 0.18);
        color: #c7f6c9;
      }
      .template-card {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 12px;
        display: grid;
        gap: 8px;
        background: rgba(244, 241, 232, 0.052);
      }
      .template-card span {
        color: #d9bd78;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .template-card strong {
        color: #fff8df;
        font-size: 13px;
        line-height: 1.25;
      }
      .template-links {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .template-links a {
        border: 1px solid rgba(224, 213, 184, 0.14);
        border-radius: 999px;
        padding: 5px 8px;
        background: rgba(4, 8, 6, 0.34);
        color: #c7f6c9;
        font-size: 11px;
        text-decoration: none;
      }
      .sidebar-foot {
        border-top: 1px solid rgba(224, 213, 184, 0.12);
        padding-top: 14px;
        color: #b8b39f;
        font-size: 12px;
        line-height: 1.45;
      }
      .topbar {
        min-height: 92px;
        border-radius: 8px;
        padding: 16px 18px;
        display: grid;
        grid-template-columns: minmax(260px, 0.9fr) minmax(360px, 1fr) auto;
        align-items: center;
        gap: 16px;
      }
      .header-copy { display: grid; gap: 4px; min-width: 0; }
      .subhead {
        max-width: 520px;
        margin: 2px 0 0;
        color: #b8b39f;
        font-size: 13px;
        line-height: 1.35;
      }
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
      .command-bar {
        min-height: 56px;
        width: 100%;
        border: 1px solid rgba(224, 213, 184, 0.15);
        border-radius: 8px;
        padding: 10px 12px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        background: rgba(4, 8, 6, 0.52);
        color: #fff8df;
        cursor: pointer;
        text-align: left;
      }
      .command-bar span {
        color: #d9bd78;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .command-bar strong {
        min-width: 0;
        line-height: 1.16;
        overflow-wrap: anywhere;
      }
      kbd {
        border: 1px solid rgba(224, 213, 184, 0.18);
        border-radius: 6px;
        padding: 4px 7px;
        background: rgba(244, 241, 232, 0.07);
        color: #b8b39f;
        font: 800 11px ui-sans-serif, system-ui;
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
      h1 { margin-bottom: 0; font-size: clamp(24px, 2.2vw, 32px); line-height: 1.05; letter-spacing: 0; }
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
        grid-template-columns: repeat(6, minmax(0, 1fr));
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
      .live-workspace {
        display: grid;
        grid-template-columns: minmax(420px, 1.42fr) minmax(320px, 0.92fr);
        gap: 16px;
        align-items: stretch;
      }
      .ops-world-panel {
        position: relative;
        min-height: 520px;
        padding: 0;
        overflow: hidden;
        background: #0f172a;
      }
      .ops-world-panel .world-head {
        position: relative;
        z-index: 2;
      }
      .ops-scene-shell {
        position: relative;
        min-height: 452px;
        background: #0f172a;
        overflow: hidden;
      }
      #world-ops-scene {
        width: 100%;
        height: 452px;
        display: block;
      }
      .css-agent-world {
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background:
          linear-gradient(30deg, transparent 31%, rgba(148, 163, 184, 0.09) 32%, transparent 33%),
          linear-gradient(150deg, transparent 31%, rgba(34, 197, 94, 0.08) 32%, transparent 33%);
        background-size: 78px 78px;
      }
      .ops-world-node {
        position: absolute;
        width: 86px;
        height: 44px;
        transform: rotate(45deg) skew(-10deg, -10deg);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        background:
          linear-gradient(135deg, var(--node-color, #38bdf8), rgba(255, 255, 255, 0.1)),
          rgba(15, 23, 42, 0.64);
        opacity: 0.86;
        box-shadow: 0 20px 46px rgba(2, 6, 23, 0.28), 0 0 28px rgba(56, 189, 248, 0.24);
      }
      .ops-agent-sprite {
        position: absolute;
        width: 34px;
        height: 34px;
        border: 2px solid rgba(255, 255, 255, 0.76);
        border-radius: 999px;
        background: radial-gradient(circle at 30% 24%, #ffffff, var(--agent-color, #38bdf8) 42%, rgba(15, 23, 42, 0.62));
        box-shadow: 0 16px 34px rgba(2, 6, 23, 0.34), 0 0 28px var(--agent-color, #38bdf8);
        animation: spriteDrift 5.6s ease-in-out infinite;
      }
      .ops-agent-sprite::after {
        content: attr(data-label);
        position: absolute;
        left: 26px;
        top: -14px;
        min-width: 56px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 4px 7px;
        background: rgba(15, 23, 42, 0.74);
        color: #f8fafc;
        font-size: 11px;
        font-weight: 850;
      }
      .ops-agent-sprite.planner { left: 27%; top: 55%; --agent-color: #22c55e; }
      .ops-agent-sprite.world { left: 45%; top: 40%; --agent-color: #38bdf8; animation-delay: -1.3s; }
      .ops-agent-sprite.dream { left: 63%; top: 55%; --agent-color: #a78bfa; animation-delay: -2.1s; }
      .ops-agent-sprite.safety { left: 77%; top: 66%; --agent-color: #f59e0b; animation-delay: -3.2s; }
      .ops-world-node.plan { left: 22%; top: 62%; --node-color: #22c55e; }
      .ops-world-node.world { left: 41%; top: 49%; --node-color: #38bdf8; }
      .ops-world-node.dream { left: 60%; top: 61%; --node-color: #a78bfa; }
      .ops-world-node.safety { left: 73%; top: 72%; --node-color: #f59e0b; }
      @keyframes spriteDrift {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50% { transform: translate3d(12px, -18px, 0); }
      }
      .ops-hud {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 16px;
        z-index: 2;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .ops-hud-card,
      .ops-agent-pill {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.78);
        box-shadow: 0 16px 40px rgba(2, 6, 23, 0.24);
        color: #f8fafc;
      }
      .ops-hud-card {
        min-height: 68px;
        padding: 10px;
      }
      .ops-hud-card span,
      .ops-agent-pill span {
        display: block;
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 850;
      }
      .ops-hud-card strong {
        display: block;
        margin-top: 5px;
        color: #ffffff;
        font-size: 15px;
        overflow-wrap: anywhere;
      }
      .ops-agent-stack {
        position: absolute;
        z-index: 2;
        top: 18px;
        right: 18px;
        width: min(230px, calc(100% - 36px));
        display: grid;
        gap: 8px;
      }
      .ops-agent-pill {
        padding: 9px 10px;
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
      }
      .ops-agent-pill i {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--agent-color, #38bdf8);
        box-shadow: 0 0 16px var(--agent-color, #38bdf8);
      }
      .ops-agent-pill strong {
        min-width: 0;
        color: #ffffff;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .quick-stack {
        display: grid;
        gap: 16px;
        align-content: start;
      }
      .quick-chat-console {
        min-height: 320px;
      }
      .quick-chat-log {
        min-height: 102px;
        display: grid;
        gap: 8px;
        margin-bottom: 10px;
      }
      .quick-message {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
        background: #f8fafc;
      }
      .quick-message strong {
        display: block;
        color: #0f172a;
        font-size: 12px;
      }
      .quick-message span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 12px;
        font-weight: 760;
        line-height: 1.35;
      }
      .quick-form-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 112px;
        gap: 8px;
      }
      .quick-form-grid label:first-child {
        grid-column: 1 / -1;
      }
      .quick-form-grid textarea {
        min-height: 76px;
      }
      .quick-form-grid .primary-button {
        align-self: end;
        justify-self: stretch;
        min-height: 40px;
      }
      .agent-activity-kanban {
        display: grid;
        gap: 10px;
      }
      .lane-card {
        min-height: 88px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        background: #f8fafc;
      }
      .lane-card span,
      .lane-card p,
      .lane-card small {
        color: #64748b;
        font-size: 11px;
        font-weight: 820;
        line-height: 1.35;
      }
      .lane-card strong {
        display: block;
        margin-top: 3px;
        color: #0f172a;
        font-size: 14px;
      }
      .lane-card p {
        margin: 6px 0 0;
      }
      .lane-card b {
        align-self: start;
        border: 1px solid rgba(37, 99, 235, 0.18);
        border-radius: 999px;
        padding: 5px 8px;
        background: #eff6ff;
        color: #1d4ed8;
        font-size: 11px;
      }
      .lane-card small {
        grid-column: 1 / -1;
        width: 26px;
        height: 26px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: #e2e8f0;
        color: #334155;
        font-weight: 950;
      }
      .run-control-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) repeat(3, minmax(0, 0.86fr));
        gap: 10px;
      }
      .builder-panel {
        display: grid;
        gap: 14px;
      }
      .builder-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .builder-step {
        min-height: 150px;
        border: 1px solid rgba(224, 213, 184, 0.13);
        border-radius: 8px;
        padding: 14px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        background: rgba(244, 241, 232, 0.052);
      }
      .builder-step .step-index {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: #2563eb;
        color: #ffffff;
        font-weight: 950;
      }
      .builder-step small,
      .builder-step p,
      .feed-item small {
        display: block;
        color: #b8b39f;
        font-size: 11px;
        font-weight: 780;
        line-height: 1.35;
      }
      .builder-step strong {
        display: block;
        margin: 4px 0 8px;
        color: #fff8df;
        font-size: 14px;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }
      .builder-step p { margin-bottom: 0; }
      .builder-step b {
        grid-column: 1 / -1;
        justify-self: start;
        border: 1px solid rgba(37, 99, 235, 0.26);
        border-radius: 999px;
        padding: 5px 9px;
        background: rgba(37, 99, 235, 0.12);
        color: #c6f3ff;
        font-size: 11px;
      }
      .control-card {
        min-height: 120px;
        border: 1px solid rgba(224, 213, 184, 0.13);
        border-radius: 8px;
        padding: 14px;
        display: grid;
        align-content: space-between;
        gap: 10px;
        background: rgba(244, 241, 232, 0.052);
      }
      .control-card.featured {
        background:
          linear-gradient(135deg, rgba(118, 199, 217, 0.14), rgba(142, 222, 146, 0.1)),
          rgba(244, 241, 232, 0.055);
      }
      .control-card span,
      .control-card small {
        display: block;
        color: #b8b39f;
        font-size: 11px;
        font-weight: 850;
      }
      .control-card strong {
        display: block;
        color: #fff8df;
        font-size: 19px;
        line-height: 1.08;
        overflow-wrap: anywhere;
      }
      .control-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .secondary-button {
        min-height: 34px;
        border: 1px solid rgba(224, 213, 184, 0.16);
        border-radius: 8px;
        padding: 8px 10px;
        background: rgba(4, 8, 6, 0.58);
        color: #fff8df;
        font-weight: 850;
        cursor: pointer;
      }
      .secondary-button.accent {
        border-color: rgba(118, 199, 217, 0.34);
        color: #c6f3ff;
      }
      .dashboard-panels {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
        gap: 16px;
      }
      .party-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .party-card {
        min-height: 128px;
        border: 1px solid rgba(224, 213, 184, 0.13);
        border-radius: 8px;
        padding: 12px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .party-avatar {
        width: 42px;
        height: 42px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: var(--agent-color, #38bdf8);
        color: #ffffff;
        font-weight: 950;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
      }
      .party-copy { min-width: 0; }
      .party-copy span,
      .party-copy small,
      .stack-item small,
      .stream-row small {
        display: block;
        color: #b8b39f;
        font-size: 11px;
        font-weight: 780;
        line-height: 1.35;
      }
      .party-copy strong {
        display: block;
        margin: 3px 0 5px;
        color: #fff8df;
        font-size: 14px;
      }
      .party-state {
        grid-column: 1 / -1;
        display: grid;
        gap: 8px;
      }
      .energy-track {
        height: 8px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(224, 213, 184, 0.12);
      }
      .energy-track i {
        display: block;
        width: var(--agent-progress, 50%);
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--agent-color, #38bdf8), #fff8df);
      }
      .stack-list { display: grid; gap: 10px; }
      .stack-item {
        border: 1px solid rgba(224, 213, 184, 0.13);
        border-radius: 8px;
        padding: 12px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        background: rgba(244, 241, 232, 0.055);
      }
      .stack-item strong {
        display: block;
        color: #fff8df;
        font-size: 13px;
      }
      .stack-item b {
        color: #c6f3ff;
        font-size: 12px;
      }
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
      .run-stream {
        display: grid;
        gap: 10px;
      }
      .feed-list {
        display: grid;
        gap: 10px;
      }
      .feed-item {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 12px;
        display: grid;
        grid-template-columns: 68px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        background: rgba(244, 241, 232, 0.055);
      }
      .feed-item > span,
      .feed-item b {
        color: #b8b39f;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .feed-item strong {
        display: block;
        color: #fff8df;
        font-size: 13px;
        overflow-wrap: anywhere;
      }
      .stream-row {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 11px 12px;
        display: grid;
        grid-template-columns: 12px minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 10px;
        background: rgba(244, 241, 232, 0.055);
      }
      .stream-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #8ede92;
        box-shadow: 0 0 18px rgba(142, 222, 146, 0.5);
      }
      .stream-row strong {
        display: block;
        color: #fff8df;
        font-size: 13px;
      }
      .stream-row > span:not(.stream-dot),
      .stream-row b {
        color: #b8b39f;
        font-size: 11px;
        font-weight: 850;
      }
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
      .status-badge.muted {
        border-color: rgba(224, 213, 184, 0.16);
        background: rgba(244, 241, 232, 0.055);
        color: #b8b39f;
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
      .session-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 14px;
      }
      .session-card {
        min-height: 92px;
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 10px;
        display: grid;
        align-content: space-between;
        gap: 8px;
        background: rgba(244, 241, 232, 0.055);
      }
      .session-card span,
      .session-card small {
        color: #b8b39f;
        font-size: 11px;
        font-weight: 850;
        line-height: 1.25;
      }
      .session-card strong {
        color: #fff8df;
        font-size: 13px;
        line-height: 1.18;
        overflow-wrap: anywhere;
      }
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
      .loadout-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .agent-card {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .agent-card strong { display: block; margin-bottom: 4px; }
      .loadout-card {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .loadout-card span {
        display: inline-flex;
        margin-bottom: 10px;
        border-radius: 999px;
        padding: 4px 8px;
        background: rgba(118, 199, 217, 0.12);
        color: #c6f3ff;
        font-size: 11px;
        font-weight: 850;
      }
      .loadout-card strong { display: block; margin-bottom: 5px; color: #fff8df; }
      .loadout-card p { margin: 0; color: #b8b39f; font-size: 12px; line-height: 1.35; }
      .loadout-card b { color: #fff8df; font-weight: 900; }
      .roster-wrap {
        width: 100%;
        overflow: auto;
        margin-top: 14px;
      }
      .roster-heading {
        min-width: 560px;
        border-bottom: 1px solid rgba(224, 213, 184, 0.12);
        padding: 0 0 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .roster-heading strong {
        color: #fff8df;
        font-size: 13px;
      }
      .roster-heading span {
        color: #b8b39f;
        font-size: 11px;
        font-weight: 850;
      }
      .roster-table {
        width: 100%;
        min-width: 560px;
        border-collapse: collapse;
      }
      .roster-table th,
      .roster-table td {
        border-bottom: 1px solid rgba(224, 213, 184, 0.12);
        padding: 11px 8px;
        text-align: left;
        vertical-align: middle;
      }
      .roster-table th {
        color: #b8b39f;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .roster-table td {
        color: #fff8df;
        font-size: 12px;
      }
      .roster-agent {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .roster-agent strong,
      .roster-agent small {
        display: block;
      }
      .roster-agent small {
        color: #b8b39f;
        font-size: 11px;
        font-weight: 800;
      }
      .roster-avatar {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        background: linear-gradient(135deg, #2563eb, #06b6d4);
        color: #ffffff;
        font-size: 11px;
        font-weight: 950;
      }
      .mission-grid { display: grid; gap: 10px; }
      .mission-card {
        border: 1px solid rgba(224, 213, 184, 0.12);
        border-radius: 8px;
        padding: 12px;
        background: rgba(244, 241, 232, 0.055);
      }
      .mission-card strong { display: block; color: #fff8df; }
      .mission-card span { display: block; margin-top: 4px; color: #b8b39f; font-size: 12px; font-weight: 750; }
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
      .workspace-switcher {
        align-self: start;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        display: grid;
        align-content: start;
        gap: 3px;
        background: #f8fafc;
      }
      .workspace-switcher span,
      .workspace-switcher small,
      .operator-profile span {
        color: #64748b;
        font-size: 11px;
        font-weight: 850;
        text-transform: uppercase;
      }
      .workspace-switcher strong,
      .operator-profile strong {
        color: #0f172a;
        font-size: 13px;
        overflow-wrap: anywhere;
      }
      .operator-profile {
        min-height: 42px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 10px;
        display: grid;
        align-content: center;
        gap: 2px;
        background: #ffffff;
      }
      .scene-layer-controls {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
      }
      .scene-layer-controls span {
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 999px;
        padding: 6px 9px;
        background: rgba(15, 23, 42, 0.68);
        color: #dbeafe;
        font-size: 11px;
        font-weight: 850;
      }
      .agent-mesh {
        position: absolute;
        left: 16px;
        top: 16px;
        width: min(250px, calc(100% - 32px));
        display: grid;
        gap: 8px;
        pointer-events: none;
      }
      .mesh-row {
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        padding: 8px 10px;
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        background: rgba(15, 23, 42, 0.74);
        color: #f8fafc;
        box-shadow: 0 14px 36px rgba(2, 6, 23, 0.26);
      }
      .mesh-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--agent-color, #38bdf8);
        box-shadow: 0 0 18px var(--agent-color, #38bdf8);
      }
      .mesh-row strong {
        min-width: 0;
        color: #ffffff;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mesh-row span:last-child {
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 850;
      }
      .world-minimap {
        position: absolute;
        right: 16px;
        top: 16px;
        width: 160px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        padding: 10px;
        display: grid;
        gap: 8px;
        background: rgba(15, 23, 42, 0.74);
        color: #f8fafc;
        box-shadow: 0 14px 36px rgba(2, 6, 23, 0.26);
      }
      .world-minimap strong {
        color: #ffffff;
        font-size: 12px;
      }
      .minimap-grid {
        position: relative;
        height: 92px;
        border-radius: 8px;
        overflow: hidden;
        background:
          linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
          rgba(15, 23, 42, 0.72);
        background-size: 23px 23px;
      }
      .minimap-node {
        position: absolute;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.76);
        border-radius: 999px;
        background: var(--agent-color, #38bdf8);
      }
      .world-inspector {
        position: absolute;
        right: 16px;
        bottom: 92px;
        width: min(260px, calc(100% - 32px));
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        padding: 12px;
        display: grid;
        gap: 10px;
        background: rgba(15, 23, 42, 0.78);
        color: #f8fafc;
        box-shadow: 0 14px 36px rgba(2, 6, 23, 0.26);
      }
      .world-inspector strong {
        color: #ffffff;
        font-size: 13px;
      }
      .inspector-tabs,
      .inspector-metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .inspector-tabs span,
      .inspector-metrics span {
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 999px;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.08);
        color: #dbeafe;
        font-size: 11px;
        font-weight: 850;
      }
      .world-state-legend {
        position: absolute;
        left: 16px;
        bottom: 92px;
        width: min(250px, calc(100% - 32px));
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        padding: 12px;
        display: grid;
        gap: 10px;
        background: rgba(15, 23, 42, 0.78);
        color: #f8fafc;
        box-shadow: 0 14px 36px rgba(2, 6, 23, 0.26);
      }
      .world-state-legend strong {
        color: #ffffff;
        font-size: 13px;
      }
      .legend-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #dbeafe;
        font-size: 11px;
        font-weight: 850;
      }
      .legend-swatch {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--agent-color, #38bdf8);
        box-shadow: 0 0 14px var(--agent-color, #38bdf8);
      }
      :root {
        color-scheme: light;
        background: #f4f7fb;
        color: #0f172a;
      }
      body {
        background:
          linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px),
          linear-gradient(180deg, #f8fafc 0%, #eef4ff 52%, #f8fafc 100%);
        background-size: 42px 42px, 42px 42px, auto;
        color: #0f172a;
      }
      a { color: #2563eb; }
      .topbar, .panel, .sidebar {
        border-color: #e2e8f0;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 18px 56px rgba(15, 23, 42, 0.08);
      }
      .sidebar {
        grid-template-rows: auto auto minmax(0, 1fr) auto auto;
      }
      .brand-mark {
        background: linear-gradient(135deg, #111827, #2563eb 55%, #7c3aed);
        color: #ffffff;
      }
      .brand-stack strong,
      h1,
      h2,
      h3,
      .health-card strong,
      .section-card strong,
      .control-card strong,
      .metric strong,
      .party-copy strong,
      .stack-item strong,
      .stream-row strong,
      .loadout-card strong,
      .session-card strong,
      .template-card strong,
      .roster-heading strong,
      .mission-card strong,
      .queue-item strong,
      .roster-agent strong,
      .roster-table td,
      .activity-table td,
      .message p {
        color: #0f172a;
      }
      .breadcrumb,
      .subhead,
      .sidebar-foot,
      .health-card span,
      .health-card small,
      .section-heading span,
      .section-card span,
      .section-card p,
      .control-card span,
      .control-card small,
      .metric span,
      .agent-card span,
      .message-role,
      .party-copy span,
      .party-copy small,
      .stack-item small,
      .stream-row small,
      .stream-row > span:not(.stream-dot),
      .stream-row b,
      .loadout-card p,
      .session-card span,
      .session-card small,
      .template-card span,
      .roster-heading span,
      .mission-card span,
      .queue-item span,
      .roster-table th,
      .roster-agent small,
      .nav-group-title,
      .activity-table th,
      label {
        color: #64748b;
      }
      .eyebrow,
      .command-bar span {
        color: #2563eb;
      }
      .nav-item,
      .tab-pill,
      .ghost-button,
      .health-card,
      .section-card,
      .builder-step,
      .control-card,
      .metric,
      .message,
      .preset-button,
      .agent-card,
      .party-card,
      .stack-item,
      .stream-row,
      .feed-item,
      .loadout-card,
      .session-card,
      .template-card,
      .mission-card,
      .queue-item,
      .endpoint-list code {
        border-color: #e2e8f0;
        background: #f8fafc;
        color: #334155;
      }
      .nav-item.active,
      .tab-pill.active,
      .ghost-button.primary {
        border-color: rgba(37, 99, 235, 0.28);
        background: #eff6ff;
        color: #1d4ed8;
      }
      .nav-glyph {
        background: #e2e8f0;
        color: #2563eb;
      }
      .command-bar {
        border-color: #dbe3ef;
        background: #ffffff;
        color: #0f172a;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
      }
      kbd {
        border-color: #dbe3ef;
        background: #f1f5f9;
        color: #475569;
      }
      .header-tabs,
      .status-pill {
        border-color: #dbe3ef;
        background: #f8fafc;
      }
      .status-pill {
        color: #15803d;
      }
      .toolbar-row span,
      .loadout-card span,
      .template-links a,
      .status-badge {
        border-color: rgba(37, 99, 235, 0.18);
        background: #eff6ff;
        color: #1d4ed8;
      }
      .roster-table th,
      .roster-table td {
        border-bottom-color: #e2e8f0;
      }
      .roster-heading {
        border-bottom-color: #e2e8f0;
      }
      .energy-track {
        background: #e2e8f0;
      }
      .stack-item b {
        color: #2563eb;
      }
      .builder-step strong,
      .feed-item strong {
        color: #0f172a;
      }
      .builder-step small,
      .builder-step p,
      .feed-item > span,
      .feed-item small,
      .feed-item b {
        color: #64748b;
      }
      .builder-step b {
        border-color: rgba(37, 99, 235, 0.18);
        background: #eff6ff;
        color: #1d4ed8;
      }
      .stream-dot {
        background: #2563eb;
        box-shadow: 0 0 18px rgba(37, 99, 235, 0.38);
      }
      .control-card.featured {
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.09), rgba(14, 165, 233, 0.08)),
          #ffffff;
      }
      .secondary-button {
        border-color: #dbe3ef;
        background: #ffffff;
        color: #0f172a;
      }
      .secondary-button.accent {
        border-color: rgba(37, 99, 235, 0.28);
        color: #1d4ed8;
      }
      textarea,
      input {
        border-color: #cbd5e1;
        background: #ffffff;
        color: #0f172a;
      }
      .primary-button {
        background: linear-gradient(135deg, #2563eb, #06b6d4);
        color: #ffffff;
      }
      .message.agent {
        border-color: rgba(37, 99, 235, 0.2);
        background: #eff6ff;
      }
      .chart-axis { stroke: rgba(15, 23, 42, 0.18); }
      .chart-grid { stroke: rgba(15, 23, 42, 0.08); }
      .chart-area { fill: rgba(37, 99, 235, 0.12); }
      .chart-line { stroke: #2563eb; }
      .chart-dot {
        fill: #ffffff;
        stroke: #2563eb;
      }
      .world-head {
        background: linear-gradient(180deg, #111827, #0f172a);
        color: #f8fafc;
      }
      .world-head h2,
      .world-head .eyebrow,
      .world-head span {
        color: #f8fafc;
      }
      .scene-wrap {
        border-top-color: rgba(255, 255, 255, 0.08);
        background: #0f172a;
      }
      .hud-item {
        border-color: rgba(255, 255, 255, 0.14);
        background: rgba(15, 23, 42, 0.78);
      }
      .hud-item span { color: #cbd5e1; }
      .hud-item strong { color: #ffffff; }
      @media (max-width: 1120px) {
        .gateway-shell { grid-template-columns: minmax(0, 1fr); }
        .sidebar {
          position: static;
          min-height: auto;
          grid-template-rows: auto;
          min-width: 0;
        }
        .nav-list { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .gateway-grid,
        .live-workspace,
        .dashboard-panels,
        .dashboard-content { grid-template-columns: 1fr; }
        .section-cards,
        .builder-grid,
        .party-grid,
        .run-control-grid,
        .health-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .world-panel { min-height: auto; }
      }
      @media (max-width: 680px) {
        .gateway-shell {
          width: calc(100vw - 20px);
          max-width: calc(100vw - 20px);
          margin: 10px auto;
        }
        .topbar {
          align-items: flex-start;
          grid-template-columns: minmax(0, 1fr);
          min-width: 0;
        }
        .sidebar,
        .workspace,
        .panel,
        .dashboard-main,
        .nav-list {
          max-width: 100%;
          min-width: 0;
        }
        .nav-item {
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .topbar-actions {
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          justify-content: stretch;
        }
        .command-bar,
        .header-tabs { width: 100%; justify-content: flex-start; }
        .command-bar {
          grid-template-columns: minmax(0, 1fr) auto;
        }
        .command-bar span { grid-column: 1 / -1; }
        .header-tabs {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }
        .tab-pill,
        .ghost-button {
          width: 100%;
          white-space: normal;
          text-align: center;
        }
        .status-pill {
          grid-column: 1 / -1;
          width: 100%;
          min-width: 0;
        }
        .nav-list { grid-template-columns: minmax(0, 1fr); }
        .metric-grid,
        .scene-hud,
        .dashboard-panels,
        .run-control-grid,
        .loadout-grid,
        .session-grid,
        .party-grid,
        .section-cards,
        .builder-grid,
        .health-strip,
        .preset-grid { grid-template-columns: 1fr; }
        .agent-mesh,
        .ops-agent-stack,
        .world-minimap,
        .world-state-legend,
        .world-inspector {
          position: static;
          width: auto;
          margin: 10px 12px 0;
        }
        .stream-row {
          grid-template-columns: 12px minmax(0, 1fr);
        }
        .feed-item {
          grid-template-columns: minmax(0, 1fr);
        }
        .stream-row > span:not(.stream-dot),
        .stream-row b {
          grid-column: 2;
        }
        .scene-layer-controls {
          width: 100%;
          justify-content: flex-start;
        }
        #world-scene { height: 420px; }
        #world-ops-scene { height: 360px; }
        .ops-scene-shell { min-height: 360px; }
        .ops-hud {
          position: static;
          margin: 10px 12px 12px;
          grid-template-columns: 1fr;
        }
        .quick-form-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="gateway-shell" data-testid="gateway-shell" data-template="tailadmin-nextjs-ai-dashboard" data-template-source="https://tailadmin.com/nextjs" data-template-preview="https://nextjs-demo.tailadmin.com/ai" data-block-reference="https://ui.shadcn.com/blocks" data-shadcn-block="dashboard-01">
      <aside class="sidebar" data-testid="gateway-sidebar">
        <div class="brand-stack">
          <div class="brand-mark">V</div>
          <div>
            <p class="eyebrow">Local Runtime</p>
            <strong>Vivarium Gateway</strong>
          </div>
        </div>
        <div class="workspace-switcher" data-testid="workspace-switcher">
          <span>Workspace</span>
          <strong>Agent Control Room</strong>
          <small>${escapedStateHud}</small>
        </div>
        <nav class="nav-list" aria-label="Gateway sections">
          <span class="nav-group-title">Operations</span>
          <a class="nav-item active" href="#command"><span class="nav-glyph">CC</span>Command Center</a>
          <a class="nav-item" href="#chat"><span class="nav-glyph">AI</span>Chat</a>
          <a class="nav-item" href="#builder"><span class="nav-glyph">BL</span>Builder</a>
          <a class="nav-item" href="#agents"><span class="nav-glyph">AG</span>Agents</a>
          <span class="nav-group-title">World</span>
          <a class="nav-item" href="#world"><span class="nav-glyph">3D</span>World</a>
          <a class="nav-item" href="#mission-board"><span class="nav-glyph">MB</span>Mission Board</a>
          <a class="nav-item" href="#memory"><span class="nav-glyph">DB</span>Memory</a>
        </nav>
        <div class="template-card" data-testid="template-reference-card">
          <span>Template Reference</span>
          <strong>TailAdmin Next.js shell with shadcn dashboard blocks.</strong>
          <div class="template-links">
            <a href="https://tailadmin.com/nextjs">TailAdmin</a>
            <a href="https://ui.shadcn.com/blocks">shadcn blocks</a>
          </div>
        </div>
        <div class="sidebar-foot">
          <strong>Status: ${daemonStatus}</strong><br>
          Local URL: ${escapedLocalUrl}<br>
          Template: TailAdmin Next.js + shadcn<br>
          Template Kit: TailAdmin Next.js + shadcn dashboard-01<br>
          Zero cloud required.
        </div>
      </aside>
      <section class="workspace" id="command">
        <header class="topbar" data-testid="site-header">
          <div class="header-copy">
            <div class="breadcrumb">Gateway / Command Center</div>
            <p class="eyebrow">Command Center</p>
            <h1>Vivarium Gateway</h1>
            <p class="subhead">Agent Workspace for local chat, runs, world state, and Dream consolidation.</p>
          </div>
          <button type="button" class="command-bar" data-testid="command-bar" data-scroll-target="chat">
            <span>Command Bar</span>
            <strong>Ask or run a goal</strong>
            <kbd>Ctrl K</kbd>
          </button>
          <div class="topbar-actions">
            <nav class="header-tabs" data-testid="gateway-tabs" aria-label="Dashboard views">
              <a class="tab-pill active" href="#command">Overview</a>
              <a class="tab-pill" href="#world">World</a>
              <a class="tab-pill" href="#activity">Runs</a>
              <a class="tab-pill" href="#memory">Memory</a>
            </nav>
            <button type="button" class="ghost-button primary" data-scroll-target="chat">New run</button>
            <a class="ghost-button" href="/status">Open status</a>
            <div class="operator-profile" data-testid="operator-profile">
              <span>Operator</span>
              <strong>Local Mac</strong>
            </div>
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
              <span>Skills</span>
              <strong data-live-field="skills-label">${escapedSkillPromoted}/${escapedSkillTotal}</strong>
              <small>promoted / total</small>
            </article>
            <article class="health-card">
              <span>Memory Facts</span>
              <strong data-live-field="memory-facts">${escapedMemoryFacts}</strong>
              <small>${escapedIdentityName}</small>
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
              <span>${escapedAgentCount} agents online</span>
            </div>
          </div>
          <section class="section-cards" data-testid="dashboard-section-cards">
            <article class="section-card">
              <span>Total Runs</span>
              <strong data-live-field="runs">${status.runs}</strong>
              <p>Recorded local agent runs in durable memory.</p>
            </article>
            <article class="section-card">
              <span>Skill Memory</span>
              <strong data-live-field="skills-total">${escapedSkillTotal}</strong>
              <p><span data-live-field="skills-promoted">${escapedSkillPromoted}</span> promoted, ${status.skills.candidates} candidates, ${status.skills.archived} archived.</p>
            </article>
            <article class="section-card">
              <span>Confidence</span>
              <strong data-live-field="confidence">${status.confidenceBuckets}</strong>
              <p>Prediction buckets available for Dream consolidation.</p>
            </article>
            <article class="section-card">
              <span>World Domains</span>
              <strong data-live-field="domain-count">${escapedDomainCount}</strong>
              <p>${escapedPublishableCount} publishable artifacts waiting for a world target.</p>
            </article>
          </section>
          <section class="live-workspace" data-testid="live-workspace" aria-label="Live Workspace">
            <article class="panel ops-world-panel" data-testid="world-ops-panel">
              <div class="world-head panel-header">
                <div>
                  <p class="eyebrow">Live Workspace</p>
                  <h2>Agent World</h2>
                </div>
                <div class="scene-layer-controls" aria-label="World controls">
                  <span>Orbit Cam</span>
                  <span>Trace Grid</span>
                  <span>Agent Paths</span>
                </div>
              </div>
              <div class="ops-scene-shell">
                <canvas id="world-ops-scene" width="920" height="452" aria-label="Live agent world" data-world-canvas="ops"></canvas>
                <div class="css-agent-world" data-testid="css-agent-world" aria-hidden="true">
                  <span class="ops-world-node plan"></span>
                  <span class="ops-world-node world"></span>
                  <span class="ops-world-node dream"></span>
                  <span class="ops-world-node safety"></span>
                  <span class="ops-agent-sprite planner" data-label="Plan"></span>
                  <span class="ops-agent-sprite world" data-label="World"></span>
                  <span class="ops-agent-sprite dream" data-label="Dream"></span>
                  <span class="ops-agent-sprite safety" data-label="Safe"></span>
                </div>
                <div class="ops-agent-stack" aria-label="Active agents">
                  <div class="ops-agent-pill" style="--agent-color: #22c55e;"><i></i><strong>Local Agent</strong><span>plan</span></div>
                  <div class="ops-agent-pill" style="--agent-color: #38bdf8;"><i></i><strong>World Scout</strong><span>read</span></div>
                  <div class="ops-agent-pill" style="--agent-color: #a78bfa;"><i></i><strong>Dream Worker</strong><span>learn</span></div>
                  <div class="ops-agent-pill" style="--agent-color: #f59e0b;"><i></i><strong>Safety Sentinel</strong><span>guard</span></div>
                </div>
                <div class="ops-hud">
                  <div class="ops-hud-card"><span>Latest Run</span><strong data-live-field="latest-hud">${escapedLatestRunHud}</strong></div>
                  <div class="ops-hud-card"><span>Runs</span><strong data-live-field="runs-label">Runs: ${status.runs}</strong></div>
                  <div class="ops-hud-card"><span>Skills</span><strong data-live-field="skills-label">${escapedSkillPromoted}/${escapedSkillTotal} promoted</strong></div>
                  <div class="ops-hud-card"><span>World</span><strong><span data-live-field="domain-count">${escapedDomainCount}</span> domains</strong></div>
                </div>
              </div>
            </article>
            <div class="quick-stack">
              <article class="panel quick-chat-console" data-testid="quick-chat-console">
                <div class="panel-header">
                  <div>
                    <p class="eyebrow">Agent Chat</p>
                    <h2>Quick Chat</h2>
                  </div>
                  <span>POST /run</span>
                </div>
                <div class="quick-chat-log" aria-live="polite">
                  <div class="quick-message"><strong>Vivarium</strong><span>Send a goal and watch it land in local memory.</span></div>
                  <div class="quick-message"><strong>Operator</strong><span>${escapeHtml(status.latestRun?.goal ?? "build a simple agent end to end")}</span></div>
                </div>
                <form id="gateway-quick-chat-form">
                  <div class="quick-form-grid">
                    <label>
                      Goal
                      <textarea name="goal" aria-label="Quick goal" autocomplete="off">${escapeHtml(status.latestRun?.goal ?? "build a simple agent end to end")}</textarea>
                    </label>
                    <label>
                      Domain
                      <input name="domain" aria-label="Quick domain" value="${escapeHtml(status.latestRun?.domain ?? "coding")}" autocomplete="off">
                    </label>
                    <button class="primary-button" type="submit">Run agent</button>
                  </div>
                </form>
              </article>
              <article class="panel" data-testid="agent-activity-kanban">
                <div class="panel-header">
                  <div>
                    <p class="eyebrow">Activity Lanes</p>
                    <h2>Agent Operations</h2>
                  </div>
                  <span>${escapedAgentCount} online</span>
                </div>
                <div class="agent-activity-kanban">
                  ${activityLanes}
                </div>
              </article>
            </div>
          </section>
          <section class="panel run-control-panel" data-testid="run-control-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Run Control</p>
                <h2>Command Deck</h2>
              </div>
              <span data-live-field="dream-summary">${escapedDreamSummary}</span>
            </div>
            <div class="run-control-grid">
              <article class="control-card featured">
                <span>Command Bar</span>
                <strong>Ask or run a goal from the local daemon.</strong>
                <div class="control-actions">
                  <button type="button" class="secondary-button accent" data-scroll-target="chat">Ask or run a goal</button>
                  <a class="secondary-button" href="/status">Status JSON</a>
                </div>
              </article>
              <article class="control-card">
                <span>Dream cycle</span>
                <strong data-live-field="dream-summary">${escapedDreamSummary}</strong>
                <div class="control-actions">
                  <button type="button" id="gateway-dream-button" class="secondary-button accent">Run Dream</button>
                </div>
              </article>
              <article class="control-card">
                <span>Active Worlds</span>
                <strong><span data-live-field="domain-count">${escapedDomainCount}</span> domains</strong>
                <small>memory graph on ${escapedStateHud}</small>
              </article>
              <article class="control-card">
                <span>Agent Loadout</span>
                <strong>${escapedAgentCount} operators ready</strong>
                <small><span data-live-field="skills-label">${escapedSkillPromoted}/${escapedSkillTotal}</span> skill memory</small>
              </article>
            </div>
          </section>
          <section class="panel builder-panel" id="builder" data-testid="agent-builder">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Agent Builder</p>
                <h2>Build Pipeline</h2>
              </div>
              <span>Template: TailAdmin Next.js + shadcn</span>
            </div>
            <div class="builder-grid">
              ${agentBuilder}
            </div>
          </section>
          <section class="dashboard-panels">
            <article class="panel" data-testid="agent-status-board">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Agent Operations</p>
                  <h2>Agent Party</h2>
                </div>
                <span>${escapedAgentCount} online</span>
              </div>
              <div class="party-grid">
                ${agentStatusBoard}
              </div>
            </article>
            <article class="panel" data-testid="model-tool-stack">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Runtime Stack</p>
                  <h2>Model + Tools</h2>
                </div>
                <span>local-first</span>
              </div>
              <div class="stack-list">
                <div class="stack-item"><div><strong>Provider Router</strong><small>Local deterministic profile now, live providers later.</small></div><b>ready</b></div>
                <div class="stack-item"><div><strong>Tool Belt</strong><small>Self tools, safety gates, and daemon APIs.</small></div><b>guarded</b></div>
                <div class="stack-item"><div><strong>World Memory</strong><small>${escapedStateHud}, ${escapedDomainCount} domains, ${escapedMemoryFacts} facts.</small></div><b>synced</b></div>
              </div>
            </article>
            <article class="panel" data-testid="operations-feed">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Operations Feed</p>
                  <h2>Live Control Feed</h2>
                </div>
                <span>local loop</span>
              </div>
              <div class="feed-list">
                ${operationsFeed}
              </div>
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
                  <div class="scene-layer-controls" data-testid="scene-layer-controls" aria-label="Canvas Layers">
                    <span>Canvas Layers</span>
                    <span>Agents</span>
                    <span>Memory</span>
                    <span>Runs</span>
                  </div>
                </div>
                <div class="scene-wrap" data-testid="world-canvas-viewport">
                  <canvas id="world-scene" width="960" height="520" aria-label="Vivarium world view"></canvas>
                  <div class="agent-mesh" data-testid="agent-mesh" aria-label="Live Agent Mesh">
                    <div class="mesh-row" style="--agent-color: #22c55e;"><span class="mesh-dot"></span><strong>Local Agent</strong><span>planning</span></div>
                    <div class="mesh-row" style="--agent-color: #38bdf8;"><span class="mesh-dot"></span><strong>World Scout</strong><span>retrieving</span></div>
                    <div class="mesh-row" style="--agent-color: #a78bfa;"><span class="mesh-dot"></span><strong>Dream Worker</strong><span>consolidating</span></div>
                  </div>
                  <div class="world-minimap" data-testid="world-minimap" aria-label="World Minimap">
                    <strong>World Minimap</strong>
                    <div class="minimap-grid">
                      <span class="minimap-node" style="left: 22%; top: 34%; --agent-color: #22c55e;"></span>
                      <span class="minimap-node" style="left: 58%; top: 22%; --agent-color: #38bdf8;"></span>
                      <span class="minimap-node" style="left: 72%; top: 62%; --agent-color: #a78bfa;"></span>
                      <span class="minimap-node" style="left: 38%; top: 70%; --agent-color: #f59e0b;"></span>
                    </div>
                  </div>
                  <div class="world-inspector" data-testid="world-inspector" aria-label="World Inspector">
                    <strong>World Inspector</strong>
                    <div class="inspector-tabs">
                      <span>Orbit Cam</span>
                      <span>Trace Grid</span>
                      <span>Agent Paths</span>
                    </div>
                    <div class="inspector-metrics">
                      <span data-live-field="runs-label">Runs: ${status.runs}</span>
                      <span>${escapedAgentCount} agents</span>
                      <span data-live-field="confidence-label">${status.confidenceBuckets} buckets</span>
                    </div>
                  </div>
                  <div class="world-state-legend" data-testid="world-state-legend" aria-label="State Legend">
                    <strong>State Legend</strong>
                    <div class="legend-grid">
                      <span class="legend-item"><i class="legend-swatch" style="--agent-color: #22c55e;"></i>Planner</span>
                      <span class="legend-item"><i class="legend-swatch" style="--agent-color: #38bdf8;"></i>World</span>
                      <span class="legend-item"><i class="legend-swatch" style="--agent-color: #a78bfa;"></i>Dream</span>
                      <span class="legend-item"><i class="legend-swatch" style="--agent-color: #f59e0b;"></i>Safety</span>
                    </div>
                  </div>
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
              <section class="panel" data-testid="live-run-stream">
                <div class="panel-header">
                  <div>
                    <p class="eyebrow">Live Run Stream</p>
                    <h2>Pipeline</h2>
                  </div>
                  <span data-live-field="latest-hud">${escapedLatestRunHud}</span>
                </div>
                <div class="run-stream">
                  ${liveRunStream}
                </div>
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
              <section class="panel" data-testid="recent-runs-table">
                <div class="panel-header">
                  <div>
                    <p class="eyebrow">Local Memory</p>
                    <h2>Recent Runs</h2>
                  </div>
                  <span data-live-field="runs-label">Runs: ${status.runs}</span>
                </div>
                <div class="activity-table-wrap">
                  <table class="activity-table">
                    <thead>
                      <tr>
                        <th>Domain</th>
                        <th>Goal</th>
                        <th>Status</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${recentRunRows}
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
            <div class="session-grid" data-testid="chat-session-cards" aria-label="Session Snapshot">
              ${sessionCards}
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
              <div class="metric"><span>Skills</span><strong data-live-field="skills-label">${escapedSkillPromoted}/${escapedSkillTotal} promoted</strong></div>
              <div class="metric"><span>Dream Candidates</span><strong>${status.memory.traceCandidates + status.memory.antiPatternCandidates}</strong></div>
            </div>
            <div class="endpoint-list">
              <code>/status</code>
              <code>POST /run</code>
              <code>POST /dream</code>
            </div>
              </section>
              <section class="panel" id="agents" data-testid="agent-loadout">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Agent Roster</p>
                <h2>Agent Loadout</h2>
              </div>
              <span>Agent Operations</span>
            </div>
            <div class="loadout-grid">
              ${agentLoadout}
            </div>
            <div class="roster-wrap" data-testid="agent-directory-table">
              <div class="roster-heading"><strong>Agent Directory</strong><span>Live lanes and queues</span></div>
              <table class="roster-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Queue</th>
                    <th>Skill</th>
                  </tr>
                </thead>
                <tbody>
                  ${agentDirectoryRows}
                </tbody>
              </table>
            </div>
              </section>
              <section class="panel" id="mission-board" data-testid="world-mission-board">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Mission Board</p>
                <h2>Active Worlds</h2>
              </div>
              <span>local-first</span>
            </div>
            <div class="mission-grid">
              ${domainCards}
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
              ${worldQueue}
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
            <div class="metric">
              <span>Latest Score</span>
              <strong data-live-field="latest-score">${escapedLatestRunHud}</strong>
            </div>
              </section>
            </aside>
          </div>
        </section>
      </section>
    </main>
    <script>
      window.__VIVARIUM_STATUS__ = ${dashboardStatusJson};
      const form = document.getElementById("gateway-chat-form");
      const quickForm = document.getElementById("gateway-quick-chat-form");
      const chatLog = document.getElementById("chat-log");
      const goalInput = form.querySelector('textarea[name="goal"]');
      const domainInput = form.querySelector('input[name="domain"]');
      const dreamButton = document.getElementById("gateway-dream-button");
      const presetButtons = document.querySelectorAll("[data-preset-goal]");
      const runForms = [form, quickForm].filter(Boolean);
      function updateRunInputs(goal, domain) {
        runForms.forEach((runForm) => {
          const goalField = runForm.querySelector('textarea[name="goal"]');
          const domainField = runForm.querySelector('input[name="domain"]');
          if (goalField) {
            goalField.value = goal;
          }
          if (domainField) {
            domainField.value = domain;
          }
        });
      }
      presetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          updateRunInputs(button.dataset.presetGoal ?? goalInput.value, button.dataset.presetDomain ?? domainInput.value);
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
      function dreamSummaryFromStatus(status) {
        const confidence = Number(status.confidenceBuckets ?? 0);
        if (confidence > 0) {
          return confidence + " confidence buckets ready";
        }
        return "No dream cycle yet";
      }
      function dreamPayloadFromStatus(status) {
        const runs = Math.max(1, Number(status.runs ?? 0));
        const latestSuccess = status.latestRun?.success;
        return {
          coding: {
            runsCompleted: runs,
            successRate: latestSuccess === false ? 0 : 1,
            skillDiversity: Math.max(1, Number(status.confidenceBuckets ?? 0) + 1),
          },
        };
      }
      async function refreshGatewayTelemetry() {
        const response = await fetch("/status");
        if (!response.ok) {
          return;
        }
        const status = await response.json();
        const runs = String(status.runs ?? 0);
        const confidence = String(status.confidenceBuckets ?? 0);
        const skills = status.skills ?? {};
        const memory = status.memory ?? {};
        const promotedSkills = String(skills.promoted ?? 0);
        const totalSkills = String(skills.total ?? 0);
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
        setLiveField("skills-total", totalSkills);
        setLiveField("skills-promoted", promotedSkills);
        setLiveField("skills-label", promotedSkills + "/" + totalSkills + " promoted");
        setLiveField("memory-facts", String(memory.semanticFacts ?? 0));
        setLiveField("domain-count", String(status.domains?.length ?? 0));
        setLiveField("dream-summary", dreamSummaryFromStatus(status));
        return status;
      }
      dreamButton?.addEventListener("click", async () => {
        dreamButton.disabled = true;
        const pending = addMessage("agent", "Vivarium", "Running Dream cycle...");
        try {
          const status = await refreshGatewayTelemetry();
          const response = await fetch("/dream", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(dreamPayloadFromStatus(status ?? {})),
          });
          const body = await response.json();
          if (!response.ok) {
            pending.textContent = body.error ?? "Dream cycle failed";
            return;
          }
          pending.textContent = body.identitySummary ?? "Dream cycle recorded";
          await refreshGatewayTelemetry();
        } catch {
          pending.textContent = "Dream cycle failed";
        } finally {
          dreamButton.disabled = false;
        }
      });
      function bindRunForm(runForm) {
        if (!runForm) {
          return;
        }
        runForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const button = runForm.querySelector("button");
          const data = new FormData(runForm);
          const goal = String(data.get("goal") ?? "");
          const domain = String(data.get("domain") ?? "");
          updateRunInputs(goal, domain);
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
            const status = await refreshGatewayTelemetry();
            const validationScore = status?.latestRun?.score ?? body.validation?.score ?? "recorded";
            pending.textContent = [
              body.success ? "Run recorded" : "Run failed",
              "Run ID: " + body.runId,
              "Validation: " + validationScore,
            ].join("\\n");
          } catch {
            pending.textContent = "Run failed";
          } finally {
            button.disabled = false;
          }
        });
      }
      bindRunForm(form);
      bindRunForm(document.getElementById("gateway-quick-chat-form"));

      const canvas = document.getElementById("world-scene");
      const ctx = canvas.getContext("2d");
      const agents = [
        { name: "Local Agent", color: "#22c55e", orbit: 0.0, task: "planning" },
        { name: "Dream Worker", color: "#a78bfa", orbit: 1.7, task: "dreaming" },
        { name: "World Scout", color: "#38bdf8", orbit: 3.2, task: "retrieving" },
        { name: "Safety Sentinel", color: "#f59e0b", orbit: 4.7, task: "guarding" },
      ];
      const worldTowers = [
        { x: -2, y: -1, floors: 3, color: "#22c55e" },
        { x: 1, y: -2, floors: 2, color: "#38bdf8" },
        { x: 2, y: 1, floors: 4, color: "#a78bfa" },
        { x: -1, y: 2, floors: 2, color: "#f59e0b" },
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
        background.addColorStop(0, "#0f172a");
        background.addColorStop(0.55, "#111827");
        background.addColorStop(1, "#1e1b4b");
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "rgba(56, 189, 248, 0.1)";
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
      const opsCanvas = document.getElementById("world-ops-scene");
      function drawOpsWorld(time) {
        if (!opsCanvas) {
          return;
        }
        const opsCtx = opsCanvas.getContext("2d");
        const rect = opsCanvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        const width = Math.max(520, Math.floor(rect.width));
        const height = Math.max(320, Math.floor(rect.height));
        if (opsCanvas.width !== width * ratio || opsCanvas.height !== height * ratio) {
          opsCanvas.width = width * ratio;
          opsCanvas.height = height * ratio;
        }
        opsCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
        opsCtx.clearRect(0, 0, width, height);
        const sky = opsCtx.createLinearGradient(0, 0, width, height);
        sky.addColorStop(0, "#020617");
        sky.addColorStop(0.48, "#0f172a");
        sky.addColorStop(1, "#172554");
        opsCtx.fillStyle = sky;
        opsCtx.fillRect(0, 0, width, height);
        const pulse = Math.sin(time / 620) * 0.5 + 0.5;
        opsCtx.fillStyle = "rgba(56, 189, 248, 0.09)";
        opsCtx.beginPath();
        opsCtx.ellipse(width * 0.5, height * 0.58, width * 0.36, height * (0.17 + pulse * 0.02), 0, 0, Math.PI * 2);
        opsCtx.fill();
        opsCtx.lineWidth = 1;
        for (let line = -width; line < width * 2; line += 48) {
          opsCtx.strokeStyle = "rgba(148, 163, 184, 0.18)";
          opsCtx.beginPath();
          opsCtx.moveTo(line + ((time / 42) % 48), height * 0.36);
          opsCtx.lineTo(line + width * 0.5 + ((time / 42) % 48), height * 0.92);
          opsCtx.stroke();
          opsCtx.strokeStyle = "rgba(34, 197, 94, 0.16)";
          opsCtx.beginPath();
          opsCtx.moveTo(line - ((time / 42) % 48), height * 0.36);
          opsCtx.lineTo(line - width * 0.5 - ((time / 42) % 48), height * 0.92);
          opsCtx.stroke();
        }
        const nodes = [
          { x: width * 0.26, y: height * 0.57, color: "#22c55e", label: "Plan" },
          { x: width * 0.45, y: height * 0.44, color: "#38bdf8", label: "World" },
          { x: width * 0.64, y: height * 0.55, color: "#a78bfa", label: "Dream" },
          { x: width * 0.78, y: height * 0.67, color: "#f59e0b", label: "Safe" },
        ];
        opsCtx.strokeStyle = "rgba(226, 232, 240, 0.22)";
        opsCtx.lineWidth = 2;
        opsCtx.beginPath();
        nodes.forEach((node, index) => {
          if (index === 0) {
            opsCtx.moveTo(node.x, node.y);
          } else {
            opsCtx.lineTo(node.x, node.y);
          }
        });
        opsCtx.stroke();
        nodes.forEach((node, index) => {
          const orbit = time / (820 + index * 110) + index;
          const bob = Math.sin(orbit) * 10;
          opsCtx.fillStyle = "rgba(2, 6, 23, 0.42)";
          opsCtx.beginPath();
          opsCtx.ellipse(node.x, node.y + 22, 32, 10, 0, 0, Math.PI * 2);
          opsCtx.fill();
          const glow = opsCtx.createRadialGradient(node.x - 5, node.y - 8 + bob, 4, node.x, node.y + bob, 34);
          glow.addColorStop(0, "#ffffff");
          glow.addColorStop(0.34, node.color);
          glow.addColorStop(1, "rgba(15, 23, 42, 0.1)");
          opsCtx.fillStyle = glow;
          opsCtx.beginPath();
          opsCtx.arc(node.x, node.y + bob, 22, 0, Math.PI * 2);
          opsCtx.fill();
          opsCtx.strokeStyle = node.color;
          opsCtx.lineWidth = 2;
          opsCtx.stroke();
          opsCtx.fillStyle = "rgba(15, 23, 42, 0.74)";
          opsCtx.fillRect(node.x - 29, node.y + 34 + bob, 58, 25);
          opsCtx.fillStyle = "#f8fafc";
          opsCtx.font = "800 12px ui-sans-serif, system-ui";
          opsCtx.fillText(node.label, node.x - 18, node.y + 51 + bob);
        });
        requestAnimationFrame(drawOpsWorld);
      }
      requestAnimationFrame(drawOpsWorld);
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
      return htmlResponse(renderDashboard(daemon, new URL(request.url).host));
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
