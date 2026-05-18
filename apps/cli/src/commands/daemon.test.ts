import { describe, expect, test } from "bun:test";

import { daemonSmokeCommand, renderDaemonSmokeCommandResult } from "./daemon.js";

describe("daemonSmokeCommand", () => {
  test("reports daemon status from the status endpoint", async () => {
    const urls: string[] = [];
    const result = await daemonSmokeCommand({
      statusUrl: "http://daemon.test/status",
      fetch: async (url) => {
        urls.push(String(url));
        return Response.json({
          status: "running",
          statePath: "/Users/tester/.vivarium/state.db",
          runs: 2,
          confidenceBuckets: 4,
        });
      },
    });

    expect(result).toEqual({
      ok: true,
      statusUrl: "http://daemon.test/status",
      daemonStatus: "running",
      statePath: "/Users/tester/.vivarium/state.db",
      runs: 2,
      confidenceBuckets: 4,
    });
    expect(urls).toEqual(["http://daemon.test/status"]);
    const output = renderDaemonSmokeCommandResult(result);
    expect(output).toContain("Memory: /Users/tester/.vivarium/state.db");
    expect(output).toContain("vivarium dashboard");
    expect(output).toContain("vivarium status");
    expect(output).not.toContain("vivarium doctor --live");
  });

  test("shows the latest local run when the daemon reports one", async () => {
    const result = await daemonSmokeCommand({
      statusUrl: "http://daemon.test/status",
      fetch: async () =>
        Response.json({
          status: "running",
          statePath: "/Users/tester/.vivarium/state.db",
          runs: 3,
          confidenceBuckets: 1,
          latestRun: {
            id: "run-123",
            goal: "build a simple agent",
            domain: "coding",
            success: true,
            score: 0.8,
          },
        }),
    });

    expect(result).toMatchObject({
      ok: true,
      latestRun: {
        id: "run-123",
        goal: "build a simple agent",
        domain: "coding",
        success: true,
        score: 0.8,
      },
    });
    expect(renderDaemonSmokeCommandResult(result)).toContain(
      "Latest run: build a simple agent (success, score 0.8)",
    );
  });

  test("returns an error when the daemon endpoint is unavailable", async () => {
    const result = await daemonSmokeCommand({
      statusUrl: "http://daemon.test/status",
      fetch: async () => new Response("not found", { status: 404 }),
    });

    expect(result).toEqual({
      ok: false,
      statusUrl: "http://daemon.test/status",
      error: "Daemon status request failed with HTTP 404",
    });
  });
});
