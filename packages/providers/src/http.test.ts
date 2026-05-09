import { describe, expect, test } from "bun:test";

import { createAnthropicProvider } from "./anthropic.js";
import { createOpenAICompatProvider } from "./openai-compat.js";
import { createOpenAIProvider } from "./openai.js";

interface CapturedRequest {
  readonly url: string;
  readonly init: RequestInit;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("HTTP provider adapters", () => {
  test("OpenAI provider posts chat completions and parses message content", async () => {
    const captured: CapturedRequest[] = [];
    const provider = createOpenAIProvider({
      id: "openai",
      apiKey: "test-key",
      model: "gpt-test",
      costClass: "medium",
      capabilities: ["chat", "json_mode"],
      fetch: async (url, init) => {
        captured.push({ url: String(url), init: init ?? {} });
        return jsonResponse({ choices: [{ message: { content: "openai text" } }] });
      },
    });

    await expect(provider.complete({ kind: "plan", input: "goal" })).resolves.toBe("openai text");
    expect(captured[0]?.url).toBe("https://api.openai.com/v1/chat/completions");
    expect((captured[0]?.init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    expect(JSON.parse(String(captured[0]?.init.body))).toMatchObject({ model: "gpt-test" });
  });

  test("OpenAI-compatible provider uses caller base URL", async () => {
    const captured: CapturedRequest[] = [];
    const provider = createOpenAICompatProvider({
      id: "compat",
      baseUrl: "https://openrouter.ai/api",
      apiKey: "router-key",
      model: "router-model",
      costClass: "cheap",
      capabilities: ["chat"],
      fetch: async (url, init) => {
        captured.push({ url: String(url), init: init ?? {} });
        return jsonResponse({ choices: [{ message: { content: "compat text" } }] });
      },
    });

    await expect(provider.complete({ kind: "execute", input: "task" })).resolves.toBe("compat text");
    expect(captured[0]?.url).toBe("https://openrouter.ai/api/v1/chat/completions");
  });

  test("Anthropic provider posts messages and parses text blocks", async () => {
    const captured: CapturedRequest[] = [];
    const provider = createAnthropicProvider({
      id: "anthropic",
      apiKey: "anthropic-key",
      model: "claude-test",
      costClass: "expensive",
      capabilities: ["chat"],
      fetch: async (url, init) => {
        captured.push({ url: String(url), init: init ?? {} });
        return jsonResponse({ content: [{ type: "text", text: "anthropic text" }] });
      },
    });

    await expect(provider.complete({ kind: "reflect", input: "run" })).resolves.toBe("anthropic text");
    expect(captured[0]?.url).toBe("https://api.anthropic.com/v1/messages");
    expect((captured[0]?.init.headers as Record<string, string>)["x-api-key"]).toBe("anthropic-key");
    expect(JSON.parse(String(captured[0]?.init.body))).toMatchObject({ model: "claude-test" });
  });
});
