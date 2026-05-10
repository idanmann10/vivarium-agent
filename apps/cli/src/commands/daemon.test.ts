import { describe, expect, test } from "bun:test";

import { daemonSmokeCommand } from "./daemon.js";

describe("daemonSmokeCommand", () => {
  test("reports daemon status from the status endpoint", async () => {
    const urls: string[] = [];
    const result = await daemonSmokeCommand({
      statusUrl: "http://daemon.test/status",
      fetch: async (url) => {
        urls.push(String(url));
        return Response.json({ status: "running", runs: 2, confidenceBuckets: 4 });
      },
    });

    expect(result).toEqual({
      ok: true,
      statusUrl: "http://daemon.test/status",
      daemonStatus: "running",
      runs: 2,
      confidenceBuckets: 4,
    });
    expect(urls).toEqual(["http://daemon.test/status"]);
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
