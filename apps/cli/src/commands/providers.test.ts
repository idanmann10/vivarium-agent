import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  configureProviderProfileCommand,
  listProviderProfilesCommand,
  providerSmokeCommand,
  renderProviderProfilesCommandResult,
  renderProviderSmokeCommandResult,
} from "./providers.js";

describe("providerSmokeCommand", () => {
  test("points empty provider profile guidance at connect setup", () => {
    const profilesPath = join(mkdtempSync(join(tmpdir(), "provider-profiles-empty-")), "profiles.json");
    const output = renderProviderProfilesCommandResult(listProviderProfilesCommand({ profilesPath }));

    expect(output).toContain("Profiles: 0");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).not.toContain("vivarium live setup --env-file live-readiness.local.env --confirm-write");
  });

  test("points blocked provider smoke guidance at connect fill and smoke", async () => {
    const output = renderProviderSmokeCommandResult(
      await providerSmokeCommand({
        kind: "openai-compat",
        apiKeyEnv: "OPENROUTER_API_KEY",
        model: "openrouter/test-model",
        baseUrl: "https://openrouter.example",
        env: {},
        fetch: async () => {
          throw new Error("fetch should not run without an API key");
        },
      }),
    );

    expect(output).toContain("Status: blocked");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain("vivarium connect smoke");
    expect(output).not.toContain("Export the missing provider value");
    expect(output).not.toContain("OPENROUTER_API_KEY");
  });

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

  test("persists provider profiles and smokes a named profile", async () => {
    const profilesPath = join(mkdtempSync(join(tmpdir(), "provider-profiles-")), "profiles.json");
    const configured = configureProviderProfileCommand({
      profilesPath,
      name: "openrouter",
      kind: "openai-compat",
      apiKeyEnv: "OPENROUTER_API_KEY",
      model: "openrouter/test-model",
      baseUrl: "https://openrouter.example",
      capabilities: ["chat", "json_mode"],
      contextWindow: 128000,
      costClass: "medium",
    });
    const requests: RequestInit[] = [];
    const result = await providerSmokeCommand({
      profilesPath,
      profile: "openrouter",
      env: { OPENROUTER_API_KEY: "provider-secret" },
      fetch: async (_url, init) => {
        requests.push(init);
        return Response.json({ choices: [{ message: { content: "profile smoke ok" } }] });
      },
    });

    expect(configured).toEqual({
      profiles: [
        {
          name: "openrouter",
          kind: "openai-compat",
          apiKeyEnv: "OPENROUTER_API_KEY",
          model: "openrouter/test-model",
          baseUrl: "https://openrouter.example",
          capabilities: ["chat", "json_mode"],
          contextWindow: 128000,
          costClass: "medium",
        },
      ],
    });
    expect(listProviderProfilesCommand({ profilesPath })).toEqual(configured);
    expect(JSON.parse(readFileSync(profilesPath, "utf8"))).toEqual(configured);
    expect(result).toEqual({
      ok: true,
      kind: "openai-compat",
      model: "openrouter/test-model",
      responsePreview: "profile smoke ok",
      responseLength: 16,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers).toMatchObject({ authorization: "Bearer provider-secret" });
  });

  test("rejects unsafe provider profile values before network use", async () => {
    const profilesPath = join(mkdtempSync(join(tmpdir(), "provider-profiles-")), "profiles.json");
    writeFileSync(
      profilesPath,
      `${JSON.stringify({
        profiles: [
          {
            name: "openrouter",
            kind: "openai-compat",
            apiKeyEnv: "OPENROUTER_API_KEY",
            model: "openrouter/test-model\nextra-header",
            baseUrl: "https://openrouter.example",
            capabilities: ["chat"],
            contextWindow: 128000,
            costClass: "medium",
          },
        ],
      })}\n`,
      "utf8",
    );

    await expect(
      providerSmokeCommand({
        profilesPath,
        profile: "openrouter",
        env: { OPENROUTER_API_KEY: "provider-secret" },
        fetch: async () => {
          throw new Error("fetch should not run for unsafe profiles");
        },
      }),
    ).rejects.toThrow("Provider profile openrouter has unsafe model");
  });
});
