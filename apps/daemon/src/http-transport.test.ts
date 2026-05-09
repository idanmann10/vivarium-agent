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
