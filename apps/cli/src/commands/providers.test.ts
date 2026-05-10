import { describe, expect, test } from "bun:test";

import { providerSmokeCommand } from "./providers.js";

describe("providerSmokeCommand", () => {
  test("returns a missing-env result without making a provider call", async () => {
    const result = await providerSmokeCommand({
      kind: "openai",
      apiKeyEnv: "VIVARIUM_MISSING_PROVIDER_KEY",
      model: "gpt-test",
      env: {},
      fetch: async () => {
        throw new Error("fetch should not run without an API key");
      },
    });

    expect(result).toEqual({
      ok: false,
      kind: "openai",
      model: "gpt-test",
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
  });

  test("runs an OpenAI-compatible provider smoke completion", async () => {
    const requests: RequestInit[] = [];
    const result = await providerSmokeCommand({
      kind: "openai-compat",
      apiKeyEnv: "OPENROUTER_API_KEY",
      model: "openrouter/test-model",
      baseUrl: "https://openrouter.example",
      env: { OPENROUTER_API_KEY: "provider-secret" },
      fetch: async (_url, init) => {
        requests.push(init);
        return Response.json({ choices: [{ message: { content: "provider smoke ok" } }] });
      },
    });

    expect(result).toEqual({
      ok: true,
      kind: "openai-compat",
      model: "openrouter/test-model",
      responsePreview: "provider smoke ok",
      responseLength: 17,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers).toMatchObject({ authorization: "Bearer provider-secret" });
  });
});
