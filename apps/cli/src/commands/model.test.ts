import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { configureProviderProfileCommand } from "./providers.js";
import { modelCommand, renderModelCommandResult } from "./model.js";

describe("modelCommand", () => {
  test("summarizes configured provider profiles without secrets", () => {
    const profilesPath = join(mkdtempSync(join(tmpdir(), "vivarium-model-")), "profiles.json");
    configureProviderProfileCommand({
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

    const result = modelCommand({ profilesPath });
    const output = renderModelCommandResult(result);

    expect(result).toEqual({
      ok: true,
      profilesPath,
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
    expect(output).toContain("Vivarium Model");
    expect(output).toContain('.-""""-.');
    expect(output).toContain("Status: configured");
    expect(output).toContain("Profiles path:");
    expect(output).toContain("[ok] openrouter");
    expect(output).toContain("Base URL: https://openrouter.example");
    expect(output).toContain("openrouter/test-model");
    expect(output).toContain("OPENROUTER_API_KEY");
    expect(output).not.toContain("provider-secret");
  });

  test("renders setup guidance when no provider profile path is configured", () => {
    const result = modelCommand({ env: {} });
    const output = renderModelCommandResult(result);

    expect(result).toEqual({
      ok: false,
      profiles: [],
      problem: "missing_profiles_path",
    });
    expect(output).toContain("Status: needs setup");
    expect(output).toContain("Profiles path: not set");
    expect(output).toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(output).toContain("vivarium model --env-file live-readiness.local.env");
    expect(output).toContain("vivarium setup");
    expect(output).toContain("docs/guides/configure-providers.md");
  });

  test("renders targeted guidance when a provider profile file has no profiles", () => {
    const profilesPath = join(mkdtempSync(join(tmpdir(), "vivarium-model-empty-")), "profiles.json");
    writeFileSync(profilesPath, `${JSON.stringify({ profiles: [] })}\n`, "utf8");

    const result = modelCommand({ profilesPath });
    const output = renderModelCommandResult(result);

    expect(result).toEqual({
      ok: false,
      profilesPath,
      profiles: [],
      problem: "no_profiles",
    });
    expect(output).toContain("No provider profiles found");
    expect(output).toContain(profilesPath);
    expect(output).toContain("vivarium setup --env-file live-readiness.local.env --confirm-write");
  });

  test("reports expected live profiles that are absent from the profile file", () => {
    const profilesPath = join(mkdtempSync(join(tmpdir(), "vivarium-model-missing-")), "profiles.json");
    configureProviderProfileCommand({
      profilesPath,
      name: "anthropic-main",
      kind: "anthropic",
      apiKeyEnv: "ANTHROPIC_API_KEY",
      model: "claude-test",
      capabilities: ["chat", "tools"],
      contextWindow: 200000,
      costClass: "expensive",
    });

    const result = modelCommand({
      env: {
        VIVARIUM_PROVIDER_PROFILES_PATH: profilesPath,
        VIVARIUM_ANTHROPIC_PROVIDER_PROFILE: "anthropic-main",
        VIVARIUM_OPENROUTER_PROVIDER_PROFILE: "openrouter",
        VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE: "private-finetune",
      },
    });
    const output = renderModelCommandResult(result);

    expect(result).toMatchObject({
      ok: false,
      profilesPath,
      problem: "missing_expected_profiles",
      expectedProfiles: ["anthropic-main", "openrouter", "private-finetune"],
      missingProfiles: ["openrouter", "private-finetune"],
    });
    expect(output).toContain("[ok] anthropic-main");
    expect(output).toContain("[fix] openrouter");
    expect(output).toContain("[fix] private-finetune");
    expect(output).toContain("vivarium setup --env-file live-readiness.local.env --confirm-write");
  });

  test("renders invalid profile errors without printing secret values", () => {
    const profilesPath = join(mkdtempSync(join(tmpdir(), "vivarium-model-invalid-")), "profiles.json");
    writeFileSync(
      profilesPath,
      `${JSON.stringify({
        profiles: [
          {
            name: "broken",
            kind: "openai-compat",
            apiKeyEnv: "PRIVATE_TOKEN",
            model: "bad model",
            capabilities: ["chat"],
            contextWindow: 1000,
            costClass: "cheap",
          },
        ],
        secret: "provider-secret",
      })}\n`,
      "utf8",
    );

    const result = modelCommand({ profilesPath });
    const output = renderModelCommandResult(result);

    expect(result).toMatchObject({
      ok: false,
      profilesPath,
      profiles: [],
      problem: "invalid_profiles",
    });
    expect(output).toContain("Fix the provider profile file");
    expect(output).toContain("unsafe model");
    expect(output).not.toContain("provider-secret");
  });
});
