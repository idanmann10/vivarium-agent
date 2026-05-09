import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { createAllowlistedFileAdapter, dispatchExternalTool } from "./index.js";

describe("dispatchExternalTool", () => {
  test("routes generic HTTP requests through the injected fetch adapter", async () => {
    const result = await dispatchExternalTool(
      {
        name: "http.request",
        args: {
          url: "https://api.example.test/widgets",
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "widget" }),
        },
      },
      {
        fetch: async (request) =>
          new Response(await request.text(), {
            status: 201,
            headers: { "x-tool": request.headers.get("content-type") ?? "" },
          }),
      },
    );

    expect(result).toMatchObject({
      ok: true,
      value: { status: 201, body: JSON.stringify({ name: "widget" }) },
    });
  });

  test("routes file read, write, and edit through an allowlisted file adapter", async () => {
    const root = mkdtempSync(join(tmpdir(), "external-files-"));
    const path = join(root, "notes.txt");
    const files = createAllowlistedFileAdapter({ allowlist: [root] });

    expect(await dispatchExternalTool({ name: "file.write", args: { path, content: "hello old world" } }, { files }))
      .toMatchObject({ ok: true });
    expect(await dispatchExternalTool({ name: "file.edit", args: { path, search: "old", replace: "new" } }, { files }))
      .toEqual({ ok: true, value: { replacements: 1 } });
    expect(await dispatchExternalTool({ name: "file.read", args: { path } }, { files })).toEqual({
      ok: true,
      value: "hello new world",
    });
    expect(await dispatchExternalTool({ name: "file.read", args: { path: "/tmp/outside.txt" } }, { files })).toEqual({
      ok: false,
      error: "File path is outside the configured allowlist",
    });
  });

  test("routes terminal, code, and MCP requests through injected adapters", async () => {
    const adapters = {
      runTerminal: async (command: string) => ({ exitCode: 0, stdout: `ran:${command}`, stderr: "" }),
      executeCode: async (request: { readonly language: string; readonly code: string }) => ({
        exitCode: 0,
        stdout: `${request.language}:${request.code.length}`,
        stderr: "",
      }),
      callMcp: async (request: { readonly server: string; readonly tool: string; readonly input: unknown }) => ({
        server: request.server,
        tool: request.tool,
        input: request.input,
      }),
    };

    expect(await dispatchExternalTool({ name: "terminal.run", args: { command: "echo test" } }, adapters)).toEqual({
      ok: true,
      value: { exitCode: 0, stdout: "ran:echo test", stderr: "" },
    });
    expect(
      await dispatchExternalTool({ name: "code.execute", args: { language: "ts", code: "console.log(1)" } }, adapters),
    ).toMatchObject({ ok: true, value: { stdout: "ts:14" } });
    expect(
      await dispatchExternalTool({ name: "mcp.call", args: { server: "memory", tool: "search", input: { q: "x" } } }, adapters),
    ).toMatchObject({ ok: true, value: { server: "memory", tool: "search" } });
  });
});
