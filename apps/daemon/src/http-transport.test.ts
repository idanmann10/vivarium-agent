import { createServer } from "node:net";
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
    expect(body).toContain("Agent Operations");
    expect(body).toContain("World View");
    expect(body).toContain("3D Agent World");
    expect(body).toContain("Agent Roster");
    expect(body).toContain("World Telemetry");
    expect(body).toContain('data-testid="gateway-sidebar"');
    expect(body).toContain('data-testid="agent-command-panel"');
    expect(body).toContain('data-testid="world-canvas-viewport"');
    expect(body).toContain("Local Agent");
    expect(body).toContain("Dream Worker");
    expect(body).toContain("World Scout");
    expect(body).toContain("Safety Sentinel");
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
    expect(body).toContain("build a simple agent end to end");
    expect(body).toContain('name="domain"');
    expect(body).toContain("Run agent");
    expect(body).toContain('fetch("/run"');
    expect(body).toContain('body.validation?.score ?? "recorded"');
    expect(body).toContain("requestAnimationFrame(drawWorld)");
    expect(body).toContain("drawAgent(");
    expect(body).toContain("drawWorldTower(");
    expect(body).toContain("drawAgentTrail(");
  });

  test("routes status, run, and dream requests to the daemon", async () => {
    const handler = createDaemonFetchHandler(createDaemonServer({ worldRoot: "../the-world" }));

    const status = await json(await handler(new Request("http://daemon/status")));
    expect(status).toMatchObject({ status: "running", runs: 0 });

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
