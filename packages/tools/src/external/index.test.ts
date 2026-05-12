import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { createAllowlistedFileAdapter, createDockerTerminalAdapter, dispatchExternalTool } from "./index.js";

describe("dispatchExternalTool", () => {
  test("routes Anthropic native message requests through an injected adapter", async () => {
    let capturedApiKey = "";
    const result = await dispatchExternalTool(
      {
        name: "anthropic-native.messages.create",
        args: {
          model: "claude-test",
          maxTokens: 256,
          messages: [{ role: "user", content: "Summarize this trace" }],
          system: "Use concise output.",
          tools: [{ name: "lookup", description: "Look up context" }],
          toolChoice: { type: "auto" },
          apiKey: "anthropic-key",
        },
      },
      {
        anthropicNative: {
          createMessage: async (request) => {
            capturedApiKey = request.apiKey ?? "";
            return {
              model: request.model,
              text: request.messages[0]?.content,
              toolCount: request.tools?.length ?? 0,
              toolChoice: request.toolChoice,
            };
          },
        },
      },
    );

    expect(capturedApiKey).toBe("anthropic-key");
    expect(result).toEqual({
      ok: true,
      value: {
        model: "claude-test",
        text: "Summarize this trace",
        toolCount: 1,
        toolChoice: { type: "auto" },
      },
    });
  });

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

  test("rejects allowlisted file paths that resolve outside the allowlist", async () => {
    const root = mkdtempSync(join(tmpdir(), "external-files-"));
    const outsideRoot = mkdtempSync(join(tmpdir(), "external-files-outside-"));
    const outsidePath = join(outsideRoot, "secret.txt");
    const linkPath = join(root, "linked-secret.txt");
    writeFileSync(outsidePath, "secret", "utf8");
    symlinkSync(outsidePath, linkPath);

    const files = createAllowlistedFileAdapter({ allowlist: [root] });

    await expect(dispatchExternalTool({ name: "file.read", args: { path: linkPath } }, { files })).resolves.toEqual({
      ok: false,
      error: "File path is outside the configured allowlist",
    });
  });

  test("web read preserves non-tag angle bracket text", async () => {
    const result = await dispatchExternalTool(
      { name: "web.read", args: { url: "https://example.test/page" } },
      {
        fetch: async () =>
          new Response("<main>2 < 3 and 4 > 1 <strong>ok</strong><script>alert(1)</script></main>", {
            headers: { "content-type": "text/html" },
          }),
      },
    );

    expect(result).toEqual({
      ok: true,
      value: { status: 200, text: "2 < 3 and 4 > 1 ok" },
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

  test("creates a Docker sandbox terminal adapter", async () => {
    const root = mkdtempSync(join(tmpdir(), "external-docker-terminal-"));
    let capturedArgs: readonly string[] = [];
    const runTerminal = createDockerTerminalAdapter({
      image: "alpine:3.20",
      workspaceRoot: root,
      runner: async (command) => {
        capturedArgs = command.args;
        return { exitCode: 0, stdout: "sandboxed\n", stderr: "" };
      },
    });

    const result = await dispatchExternalTool({ name: "terminal.run", args: { command: "pwd && ls" } }, { runTerminal });

    expect(result).toEqual({ ok: true, value: { exitCode: 0, stdout: "sandboxed\n", stderr: "" } });
    expect(capturedArgs).toEqual([
      "run",
      "--rm",
      "--network",
      "none",
      "-v",
      `${root}:/workspace`,
      "-w",
      "/workspace",
      "alpine:3.20",
      "sh",
      "-lc",
      "pwd && ls",
    ]);
  });

  test("routes computer-use requests through an injected adapter", async () => {
    const adapters = {
      computer: {
        screenshot: async () => ({ image: "screen" }),
        click: async (request: { readonly target: string }) => ({ clicked: request.target }),
        type: async (request: { readonly text: string }) => ({ typed: request.text.length }),
        scroll: async (request: { readonly direction: string }) => ({ scrolled: request.direction }),
        listWindows: async () => [{ id: "win-1", title: "Editor" }],
        focusWindow: async (request: { readonly windowId: string }) => ({ focused: request.windowId }),
      },
    };

    expect(await dispatchExternalTool({ name: "computer.screenshot", args: {} }, adapters)).toEqual({
      ok: true,
      value: { image: "screen" },
    });
    expect(await dispatchExternalTool({ name: "computer.click", args: { target: "button" } }, adapters)).toEqual({
      ok: true,
      value: { clicked: "button" },
    });
    expect(await dispatchExternalTool({ name: "computer.type", args: { text: "hello" } }, adapters)).toEqual({
      ok: true,
      value: { typed: 5 },
    });
    expect(await dispatchExternalTool({ name: "computer.scroll", args: { direction: "down" } }, adapters)).toEqual({
      ok: true,
      value: { scrolled: "down" },
    });
    expect(await dispatchExternalTool({ name: "computer.list_windows", args: {} }, adapters)).toEqual({
      ok: true,
      value: [{ id: "win-1", title: "Editor" }],
    });
    expect(await dispatchExternalTool({ name: "computer.focus_window", args: { windowId: "win-1" } }, adapters)).toEqual({
      ok: true,
      value: { focused: "win-1" },
    });
  });

  test("routes web fetch, read, and search requests through injected adapters", async () => {
    const adapters = {
      fetch: async (request: Request) =>
        new Response("<html><body><h1>Example</h1><p>Readable page</p></body></html>", {
          status: request.url.includes("example.test") ? 200 : 404,
        }),
      searchWeb: async (query: string) => [{ title: "Example", url: "https://example.test", snippet: `Result for ${query}` }],
    };

    expect(await dispatchExternalTool({ name: "web.fetch", args: { url: "https://example.test" } }, adapters)).toMatchObject({
      ok: true,
      value: { status: 200, body: expect.stringContaining("<h1>Example</h1>") },
    });
    expect(await dispatchExternalTool({ name: "web.read", args: { url: "https://example.test" } }, adapters)).toEqual({
      ok: true,
      value: { status: 200, text: "Example Readable page" },
    });
    expect(await dispatchExternalTool({ name: "web.search", args: { query: "example" } }, adapters)).toEqual({
      ok: true,
      value: [{ title: "Example", url: "https://example.test", snippet: "Result for example" }],
    });
  });
});
