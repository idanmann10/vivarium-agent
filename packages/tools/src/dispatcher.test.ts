import { describe, expect, test } from "bun:test";

import { createMemoryCredentialStore } from "./credentials/store.js";
import { createToolDispatcher, type ToolDispatchEvent } from "./dispatcher.js";

describe("createToolDispatcher", () => {
  test("routes builtin handlers before external adapters", async () => {
    const dispatcher = createToolDispatcher({
      builtinHandlers: {
        "identity.summary": async () => "local identity",
      },
      externalAdapters: {},
    });

    await expect(dispatcher.dispatch({ name: "identity.summary", args: {} })).resolves.toEqual({
      ok: true,
      value: "local identity",
    });
  });

  test("injects HTTP credentials, applies safety, and emits audit events", async () => {
    const credentials = createMemoryCredentialStore([
      {
        kind: "bearer",
        name: "NOTION_TOKEN",
        purpose: "Read workspace pages",
        value: "secret-token",
      },
    ]);
    const events: ToolDispatchEvent[] = [];
    let authorization = "";
    const dispatcher = createToolDispatcher({
      credentials,
      httpSafety: {
        allowlist: ["https://api.example.test"],
        destructiveRequiresConfirmation: true,
      },
      externalAdapters: {
        fetch: async (request) => {
          authorization = request.headers.get("authorization") ?? "";
          return Response.json({ ok: true });
        },
      },
      onDispatch: (event) => events.push(event),
    });

    const allowed = await dispatcher.dispatch({
      name: "http.request",
      args: {
        url: "https://api.example.test/pages",
        method: "GET",
        credentialName: "NOTION_TOKEN",
      },
    });

    expect(allowed).toMatchObject({ ok: true });
    expect(authorization).toBe("Bearer secret-token");
    expect(events).toContainEqual(expect.objectContaining({ name: "http.request", status: "ok" }));

    const blocked = await dispatcher.dispatch({
      name: "http.request",
      args: {
        url: "https://api.example.test/pages/1",
        method: "DELETE",
      },
    });

    expect(blocked).toEqual({ ok: false, error: "Destructive request requires confirmation", blocked: true });
    expect(events).toContainEqual(expect.objectContaining({ name: "http.request", status: "blocked" }));
  });
});
