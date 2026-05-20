import { createServer } from "node:net";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";

import { createDaemonFetchHandler, startDaemonHttpServer } from "./http-transport.js";
import { createDaemonServer } from "./server.js";

async function json(response: Response): Promise<unknown> {
  return response.json();
}

async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => {
        if (typeof address === "object" && address !== null) {
          resolve(address.port);
          return;
        }
        reject(new Error("Failed to allocate an available port."));
      });
    });
  });
}

describe("createDaemonFetchHandler", () => {
  test("serves a human-readable dashboard at the daemon root", async () => {
    const handler = createDaemonFetchHandler(createDaemonServer({ worldRoot: "../the-world" }));

    const response = await handler(new Request("http://daemon/"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("<title>Vivarium Gateway</title>");
    expect(body).toContain("Vivarium Gateway");
    expect(body).toContain("Agent Chat");
    expect(body).toContain("Command Center");
    expect(body).toContain("Operations Overview");
    expect(body).toContain("Run Signal");
    expect(body).toContain("Recent Activity");
    expect(body).toContain("Operator Console");
    expect(body).toContain("Agent Operations");
    expect(body).toContain("World View");
    expect(body).toContain("3D Agent World");
    expect(body).toContain("Agent Roster");
    expect(body).toContain("World Telemetry");
    expect(body).toContain("Skill Memory");
    expect(body).toContain("Memory Facts");
    expect(body).toContain("Agent Control Room");
    expect(body).toContain("Command Deck");
    expect(body).toContain("Live Agent Mesh");
    expect(body).toContain("World Minimap");
    expect(body).toContain("Canvas Layers");
    expect(body).toContain("Recent Runs");
    expect(body).toContain('data-testid="gateway-sidebar"');
    expect(body).toContain('data-testid="workspace-switcher"');
    expect(body).toContain('data-testid="operator-profile"');
    expect(body).toContain('data-testid="agent-mesh"');
    expect(body).toContain('data-testid="world-minimap"');
    expect(body).toContain('data-testid="scene-layer-controls"');
    expect(body).toContain('data-template="tailadmin-nextjs-ai-dashboard"');
    expect(body).toContain('data-template-source="https://tailadmin.com/nextjs"');
    expect(body).toContain('data-template-preview="https://nextjs-demo.tailadmin.com/ai"');
    expect(body).toContain('data-block-reference="https://ui.shadcn.com/blocks"');
    expect(body).toContain('data-testid="site-header"');
    expect(body).toContain('data-testid="gateway-tabs"');
    expect(body).toContain('data-testid="command-bar"');
    expect(body).toContain('data-testid="dashboard-toolbar"');
    expect(body).toContain('data-testid="health-strip"');
    expect(body).toContain('data-testid="dashboard-section-cards"');
    expect(body).toContain('data-testid="run-control-panel"');
    expect(body).toContain('data-testid="run-signal-chart"');
    expect(body).toContain('data-testid="activity-table"');
    expect(body).toContain('data-testid="recent-runs-table"');
    expect(body).toContain('data-testid="agent-command-panel"');
    expect(body).toContain('data-testid="agent-loadout"');
    expect(body).toContain('data-testid="world-mission-board"');
    expect(body).toContain('data-testid="world-canvas-viewport"');
    expect(body).toContain('data-testid="world-queue"');
    expect(body).toContain('data-testid="agent-presets"');
    expect(body).toContain("Gateway / Command Center");
    expect(body).toContain("Overview");
    expect(body).toContain("Command Bar");
    expect(body).toContain("Ask or run a goal");
    expect(body).toContain("Run Control");
    expect(body).toContain("Dream cycle");
    expect(body).toContain("Agent Workspace");
    expect(body).toContain("Agent Loadout");
    expect(body).toContain("Mission Board");
    expect(body).toContain("Active Worlds");
    expect(body).toContain("New run");
    expect(body).toContain("Open status");
    expect(body).toContain("System Health");
    expect(body).toContain("Model Router");
    expect(body).toContain("Tool Policy");
    expect(body).toContain("Storage");
    expect(body).toContain("Queued Work");
    expect(body).toContain("Agent presets");
    expect(body).toContain("Debug");
    expect(body).toContain("Ship");
    expect(body).toContain("Research");
    expect(body).toContain("Run Dream");
    expect(body).toContain("Pipeline");
    expect(body).toContain("Stage");
    expect(body).toContain("Plan");
    expect(body).toContain("Predict");
    expect(body).toContain("Execute");
    expect(body).toContain("Validate");
    expect(body).toContain("Local Agent");
    expect(body).toContain("Dream Worker");
    expect(body).toContain("World Scout");
    expect(body).toContain("Safety Sentinel");
    expect(body).toContain('id="gateway-dream-button"');
    expect(body).toContain('<canvas id="world-scene"');
    expect(body).toContain('data-testid="gateway-shell"');
    expect(body).toContain("Status: running");
    expect(body).toContain("Runs: 0");
    expect(body).toContain("Latest run");
    expect(body).toContain("None yet");
    expect(body).toContain("/status");
    expect(body).toContain("POST /run");
    expect(body).not.toContain('href="/run"');
    expect(body).toContain('<form id="gateway-chat-form">');
    expect(body).toContain('id="chat-log"');
    expect(body).toContain('name="goal"');
    expect(body).toContain('aria-label="Goal"');
    expect(body).toContain("build a simple agent end to end");
    expect(body).toContain('name="domain"');
    expect(body).toContain('aria-label="Domain"');
    expect(body).toContain("Run agent");
    expect(body).toContain('fetch("/run"');
    expect(body).toContain('fetch("/dream"');
    expect(body).toContain('"Run recorded"');
    expect(body).toContain('body.validation?.score ?? "recorded"');
    expect(body).toContain('data-live-field="runs"');
    expect(body).toContain('data-live-field="runs-label"');
    expect(body).toContain('data-live-field="latest-score"');
    expect(body).toContain('data-live-field="latest-run"');
    expect(body).toContain('data-live-field="latest-hud"');
    expect(body).toContain('data-live-field="dream-summary"');
    expect(body).toContain('data-live-field="confidence"');
    expect(body).toContain('data-live-field="skills-total"');
    expect(body).toContain('data-live-field="skills-promoted"');
    expect(body).toContain('data-live-field="skills-label"');
    expect(body).toContain('data-live-field="memory-facts"');
    expect(body).toContain('data-live-field="domain-count"');
    expect(body).toContain("async function refreshGatewayTelemetry()");
    expect(body).toContain("window.__VIVARIUM_STATUS__");
    expect(body).toContain('fetch("/status"');
    expect(body).toContain("await refreshGatewayTelemetry();");
    expect(body).toContain("const presetButtons = document.querySelectorAll");
    expect(body).toContain("data-preset-goal");
    expect(body).toContain("scrollIntoView");
    expect(body).toContain("requestAnimationFrame(drawWorld)");
    expect(body).toContain("drawAgent(");
    expect(body).toContain("drawWorldTower(");
    expect(body).toContain("drawAgentTrail(");
  });

  test("routes status, run, and dream requests to the daemon", async () => {
    const handler = createDaemonFetchHandler(createDaemonServer({ worldRoot: "../the-world" }));

    const status = await json(await handler(new Request("http://daemon/status")));
    expect(status).toMatchObject({
      status: "running",
      runs: 0,
      skills: {
        total: 0,
        promoted: 0,
        candidates: 0,
        archived: 0,
        habitual: 0,
      },
      memory: {
        semanticFacts: 0,
        traceCandidates: 0,
        antiPatternCandidates: 0,
        publishableArtifacts: 0,
      },
      domains: [],
      recentRuns: [],
    });

    const run = await json(
      await handler(
        new Request("http://daemon/run", {
          method: "POST",
          body: JSON.stringify({ goal: "write a transport test", domain: "coding" }),
        }),
      ),
    );
    expect(run).toMatchObject({ success: true });

    const statusAfterRun = await json(await handler(new Request("http://daemon/status")));
    expect(statusAfterRun).toMatchObject({
      status: "running",
      runs: 1,
      domains: [{ name: "coding", runs: 1, skills: 0, successRate: 1, latestGoal: "write a transport test" }],
      recentRuns: [{ goal: "write a transport test", domain: "coding", success: true, score: 0.8 }],
      latestRun: {
        goal: "write a transport test",
        domain: "coding",
        success: true,
        score: 0.8,
      },
    });

    const dashboardAfterRun = await handler(new Request("http://daemon/"));
    expect(await dashboardAfterRun.text()).toContain(
      "write a transport test (success, score 0.8)",
    );

    const dream = await json(
      await handler(
        new Request("http://daemon/dream", {
          method: "POST",
          body: JSON.stringify({ coding: { runsCompleted: 4, successRate: 1, skillDiversity: 2 } }),
        }),
      ),
    );
    expect(dream).toMatchObject({ identitySummary: expect.stringContaining("coding") });
  });

  test("keeps the world HUD compact while preserving detailed telemetry cards", async () => {
    const statePath = join(mkdtempSync(join(tmpdir(), "vivarium-daemon-hud-")), "state.db");
    const daemon = createDaemonServer({ statePath, worldRoot: "../the-world" });
    const handler = createDaemonFetchHandler(daemon);

    await handler(
      new Request("http://daemon/run", {
        method: "POST",
        body: JSON.stringify({ goal: "write an intentionally long local agent goal", domain: "coding" }),
      }),
    );

    const response = await handler(new Request("http://daemon/"));
    const body = await response.text();

    expect(body).toContain(`<div class="metric"><span>Memory</span><strong>${statePath}</strong></div>`);
    expect(body).toContain("write an intentionally long local agent goal (success, score 0.8)");
    expect(body).toContain(
      '<div class="hud-item"><span>Latest</span><strong data-live-field="latest-hud">success, score 0.8</strong></div>',
    );
    expect(body).toContain('<div class="hud-item"><span>State</span><strong>state.db</strong></div>');
  });

  test("renders the dashboard local URL from the request origin", async () => {
    const handler = createDaemonFetchHandler(createDaemonServer({ worldRoot: "../the-world" }));

    const response = await handler(new Request("http://127.0.0.1:6543/"));
    const body = await response.text();

    expect(body).toContain("Local URL: 127.0.0.1:6543");
    expect(body).not.toContain("Local URL: 127.0.0.1:8787");
  });

  test("returns stable JSON errors for invalid transport requests", async () => {
    const handler = createDaemonFetchHandler(createDaemonServer({ worldRoot: "../the-world" }));

    const wrongMethod = await handler(new Request("http://daemon/status", { method: "POST" }));
    expect(wrongMethod.status).toBe(405);
    expect(await json(wrongMethod)).toEqual({ error: "method not allowed" });

    const invalidJson = await handler(new Request("http://daemon/run", { method: "POST", body: "{" }));
    expect(invalidJson.status).toBe(400);
    expect(await json(invalidJson)).toEqual({ error: "invalid json" });

    const invalidRun = await handler(
      new Request("http://daemon/run", { method: "POST", body: JSON.stringify({ goal: "", domain: "coding" }) }),
    );
    expect(invalidRun.status).toBe(400);
    expect(await json(invalidRun)).toEqual({ error: "invalid run request" });

    const missing = await handler(new Request("http://daemon/missing"));
    expect(missing.status).toBe(404);
    expect(await json(missing)).toEqual({ error: "not found" });
  });
});

describe("startDaemonHttpServer", () => {
  test("starts and stops a Bun HTTP daemon server", async () => {
    const port = await findAvailablePort();
    const server = startDaemonHttpServer({
      daemon: createDaemonServer({ worldRoot: "../the-world" }),
      hostname: "127.0.0.1",
      port,
    });

    try {
      const response = await fetch(`${server.url}/status`);

      expect(response.status).toBe(200);
      expect(await json(response)).toMatchObject({ status: "running" });
    } finally {
      server.stop();
    }
  });
});
