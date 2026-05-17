import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { liveSetupCommand } from "./live.js";
import {
  connectCommand,
  connectFillCommand,
  connectSignupCommand,
  connectSmokeCommand,
  renderConnectWizardCommandResult,
  renderConnectCommandResult,
  renderConnectFillCommandResult,
  renderConnectInitCommandResult,
  renderConnectSignupCommandResult,
  renderConnectSetupCommandResult,
  renderConnectSmokeCommandResult,
} from "./connect.js";

function providerSmokeResponse(url: string): Response {
  if (new URL(url).hostname === "api.anthropic.com") {
    return Response.json({ content: [{ type: "text", text: "anthropic ok" }] });
  }
  return Response.json({ choices: [{ message: { content: "compat ok" } }] });
}

describe("connectCommand", () => {
  test("renders a wizard-style live setup handoff without raw setup keys", () => {
    const output = renderConnectWizardCommandResult({
      envFilePath: "live-readiness.local.env",
      setupFileStatus: "created",
      mode: "0600",
      templatePath: "docs/live-readiness.env.example",
      prefilled: [],
      providers: connectSignupCommand().providers,
      fillResult: {
        ok: true,
        written: true,
        envFilePath: "live-readiness.local.env",
        updated: [
          { group: "Anthropic", label: "API key", key: "ANTHROPIC_API_KEY" },
          { group: "OpenRouter", label: "API key", key: "OPENROUTER_API_KEY" },
          { group: "Private OpenAI-compatible", label: "base URL", key: "VIVARIUM_OAI_COMPAT_BASE_URL" },
          { group: "Internal credential", label: "health URL", key: "VIVARIUM_INTERNAL_API_HEALTH_URL" },
        ],
      },
      nextCommands: [
        "vivarium connect signup",
        "vivarium connect",
        "vivarium connect fill",
        "vivarium connect setup --confirm-write",
        "vivarium connect smoke",
        "vivarium proof init",
        "vivarium proof",
        "vivarium doctor --live",
      ],
    });

    expect(output).toContain("Vivarium Connect Wizard");
    expect(output).toContain("Status: setup file created");
    expect(output).toContain("Setup file: live-readiness.local.env");
    expect(output).toContain("Permissions: 0600");
    expect(output).toContain("Anthropic: https://console.anthropic.com/settings/keys");
    expect(output).toContain("OpenRouter: https://openrouter.ai/keys");
    expect(output).toContain("Private OpenAI-compatible: ask for endpoint URL, model, context window, and API key");
    expect(output).toContain("Filled setup values:");
    expect(output).not.toContain("Default local files prepared:");
    expect(output).toContain("Anthropic: API key");
    expect(output).toContain("OpenRouter: API key");
    expect(output).toContain("Private OpenAI-compatible: base URL");
    expect(output).toContain("Internal credential: health URL");
    expect(output).toContain("Keep values in local files; use vivarium connect fill only for scripted updates.");
    expect(output).toContain("Use vivarium connect to review readiness before writing provider profiles or credentials.");
    expect(output).not.toContain("Use the dashboard");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain("vivarium proof init");
    expect(output).toContain("vivarium doctor --live");
    expect(output).toContain("Re-run the focused commands with --details only when you need exact setup fields.");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("OPENROUTER_API_KEY");
    expect(output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(output).not.toContain("providers configure --profiles-path");
  });

  test("groups generated local setup files by operator phase", () => {
    const output = renderConnectWizardCommandResult({
      envFilePath: "live-readiness.local.env",
      setupFileStatus: "created",
      mode: "0600",
      templatePath: "docs/live-readiness.env.example",
      prefilled: [],
      providers: connectSignupCommand().providers,
      secretFiles: {
        directory: "/tmp/vivarium-secrets",
        files: [
          {
            label: "Agent repo name",
            path: "/tmp/vivarium-secrets/agent-repo-name.txt",
            status: "created",
            ready: false,
          },
          {
            label: "GitHub token",
            path: "/tmp/vivarium-secrets/github-token.key",
            status: "created",
            ready: false,
          },
          {
            label: "Anthropic API key",
            path: "/tmp/vivarium-secrets/anthropic.key",
            status: "created",
            ready: false,
          },
          {
            label: "Credential master key",
            path: "/tmp/vivarium-secrets/credential-master.key",
            status: "created",
            ready: false,
          },
        ],
      },
      nextCommands: ["vivarium connect signup", "vivarium connect", "vivarium connect fill"],
    });

    expect(output).toContain("Local setup checklist:");
    expect(output).toContain("[needs] Names and worlds: 1 file");
    expect(output).toContain("[needs] GitHub/public release: 1 file");
    expect(output).toContain("[needs] Provider accounts: 1 file");
    expect(output).toContain("[needs] Internal credential: 1 file");
    expect(output).toContain("Names and worlds:");
    expect(output).toContain("  Agent repo name: /tmp/vivarium-secrets/agent-repo-name.txt");
    expect(output).toContain("GitHub/public release:");
    expect(output).toContain("  GitHub token: /tmp/vivarium-secrets/github-token.key");
    expect(output).toContain("Provider accounts:");
    expect(output).toContain("  Anthropic API key: /tmp/vivarium-secrets/anthropic.key");
    expect(output).toContain("Internal credential:");
    expect(output).toContain("  Credential master key: /tmp/vivarium-secrets/credential-master.key");
    expect(output).toContain("[2] Paste local values and rerun setup");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
  });

  test("renders a wizard live setup write without repeating the setup command", () => {
    const output = renderConnectWizardCommandResult({
      envFilePath: "live-readiness.local.env",
      setupFileStatus: "existing",
      prefilled: [],
      providers: connectSignupCommand().providers,
      fillResult: {
        ok: true,
        written: true,
        envFilePath: "live-readiness.local.env",
        updated: [
          { group: "Provider profiles", label: "profile file path", key: "VIVARIUM_PROVIDER_PROFILES_PATH" },
          { group: "Internal credential", label: "credential store path", key: "VIVARIUM_CREDENTIALS_PATH" },
          { group: "V1 evidence", label: "manifest path", key: "VIVARIUM_V1_EVIDENCE_PATH" },
        ],
      },
      setupResult: {
        ok: true,
        written: true,
        providerProfiles: ["anthropic-main", "openrouter", "private-finetune"],
        credentialName: "INTERNAL_API_TOKEN",
        paths: {
          providerProfilesPath: "/tmp/vivarium-provider-profiles.json",
          credentialsPath: "/tmp/vivarium-credentials.enc",
          evidenceManifestPath: "/tmp/vivarium-v1-evidence.json",
        },
      },
      nextCommands: [
        "vivarium connect",
        "vivarium connect smoke",
        "vivarium proof init",
        "vivarium proof",
        "vivarium doctor --live",
      ],
    });

    expect(output).toContain("Live setup written:");
    expect(output).toContain("Provider profiles: anthropic-main, openrouter, private-finetune");
    expect(output).toContain("Credential: INTERNAL_API_TOKEN");
    expect(output).toContain("Provider profile file: /tmp/vivarium-provider-profiles.json");
    expect(output).toContain("Credential store: /tmp/vivarium-credentials.enc");
    expect(output).toContain("Evidence manifest: /tmp/vivarium-v1-evidence.json");
    expect(output).toContain("vivarium connect smoke");
    expect(output).not.toContain("vivarium connect setup --confirm-write");
    expect(output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
  });

  test("renders connect init with a signup-first live handoff", () => {
    const output = renderConnectInitCommandResult({
      ok: true,
      written: true,
      path: "live-readiness.local.env",
      mode: "0600",
      templatePath: "docs/live-readiness.env.example",
      prefilled: [],
    });

    expect(output).toContain("Vivarium Connect Init");
    expect(output).toContain("Permissions: 0600");
    expect(output).toContain("[1] Open account and key handoff");
    expect(output).toContain("vivarium connect signup");
    expect(output).not.toContain("Paste secrets");
    expect(output).toContain("[2] Review live readiness");
    expect(output).toContain("vivarium connect");
    expect(output).toContain("[3] Fill live settings");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain("vivarium connect smoke");
    expect(output).toContain("vivarium proof");
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
  });

  test("renders a signup-first provider handoff without raw setup keys", () => {
    const result = connectSignupCommand();
    const output = renderConnectSignupCommandResult(result);

    expect(result.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Anthropic",
          signupUrl: "https://console.anthropic.com/settings/keys",
        }),
        expect.objectContaining({
          name: "OpenRouter",
          signupUrl: "https://openrouter.ai/keys",
        }),
        expect.objectContaining({ name: "Private OpenAI-compatible" }),
      ]),
    );
    expect(output).toContain("Vivarium Connect Signup");
    expect(output).toContain("Accounts and keys");
    expect(output).toContain("Anthropic");
    expect(output).toContain("https://console.anthropic.com/settings/keys");
    expect(output).toContain("OpenRouter");
    expect(output).toContain("https://openrouter.ai/keys");
    expect(output).toContain("Private OpenAI-compatible");
    expect(output).toContain("Ask for the internal endpoint URL, model name, context window, and API key.");
    expect(output).toContain("Release and credential handoff");
    expect(output).toContain("GitHub/public release");
    expect(output).toContain("GitHub token or gh auth, owner, repository ID, and Discussion category ID.");
    expect(output).toContain("Internal credential");
    expect(output).toContain("Internal API token, health URL, and local credential master key.");
    expect(output).toContain("Encrypted credential smoke without printing the secret.");
    expect(output).toContain("Setup handoff");
    expect(output).toContain("Run vivarium setup live to generate default local files.");
    expect(output).toContain("Local value map");
    expect(output).toContain("  Run vivarium setup live once, then paste one value into each generated file.");
    expect(output).toContain("Provider accounts:");
    expect(output).toContain("    Anthropic API key: ~/.vivarium/secrets/anthropic.key");
    expect(output).toContain("    Private model context window: ~/.vivarium/secrets/private-context-window.txt");
    expect(output).toContain("GitHub/public release:");
    expect(output).toContain("    GitHub token: ~/.vivarium/secrets/github-token.key");
    expect(output).toContain("Internal credential:");
    expect(output).toContain("    Internal API health URL: ~/.vivarium/secrets/internal-health-url.txt");
    expect(output).toContain("Paste one value per file; rerun vivarium setup live after filling them.");
    expect(output).not.toContain("Paste values into ~/.vivarium/secrets, then rerun vivarium setup live.");
    expect(output).toContain("Generated profiles, credentials, and evidence files stay under ~/.vivarium/live.");
    expect(output).toContain("vivarium setup live");
    expect(output).not.toContain("\n      vivarium connect signup\n");
    expect(output).toContain("vivarium connect");
    expect(output).toContain("vivarium setup live");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain(
      [
        "  [1] Prepare live readiness",
        "      vivarium setup live",
        "      vivarium connect",
        "      vivarium connect fill",
        "      vivarium connect setup --confirm-write",
      ].join("\n"),
    );
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain("vivarium connect smoke");
    expect(output).toContain(
      [
        "  [3] Prepare live evidence",
        "      vivarium proof init",
        "      vivarium proof",
      ].join("\n"),
    );
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("OPENROUTER_API_KEY");
    expect(output).not.toContain("VIVARIUM_OAI_COMPAT_API_KEY");
    expect(output).not.toContain("GITHUB_TOKEN");
    expect(output).not.toContain("VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE");
    expect(output).not.toContain("providers configure --profiles-path");
  });

  test("renders provider signup guidance without raw setup keys by default", () => {
    const result = connectCommand();
    const output = renderConnectCommandResult(result);

    expect(result.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Anthropic",
          signupUrl: "https://console.anthropic.com/settings/keys",
        }),
        expect.objectContaining({
          name: "OpenRouter",
          signupUrl: "https://openrouter.ai/keys",
        }),
        expect.objectContaining({ name: "Private OpenAI-compatible" }),
      ]),
    );
    expect(output).toContain("Vivarium Connect");
    expect(output).toContain("Anthropic");
    expect(output).toContain("https://console.anthropic.com/settings/keys");
    expect(output).toContain("OpenRouter");
    expect(output).toContain("https://openrouter.ai/keys");
    expect(output).toContain("Private OpenAI-compatible");
    expect(output).toContain("Release and credential handoff");
    expect(output).toContain("GitHub/public release");
    expect(output).toContain("GitHub token or gh auth, owner, repository ID, and Discussion category ID.");
    expect(output).toContain("Internal credential");
    expect(output).toContain("Internal API token, health URL, and local credential master key.");
    expect(output).toContain("vivarium setup live");
    expect(output).toContain("vivarium connect signup");
    expect(output).toContain("vivarium connect");
    expect(output).toContain(
      [
        "      vivarium setup live",
        "      vivarium connect signup",
        "      vivarium connect",
        "      vivarium connect fill",
        "      vivarium connect setup --confirm-write",
      ].join("\n"),
    );
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain("vivarium proof init");
    expect(output).toContain("vivarium proof");
    expect(output).toContain("vivarium doctor --live");
    expect(output).toContain("Re-run with --details");
    expect(output).not.toContain("vivarium connect init");
    expect(output).not.toContain("vivarium live env-init --path live-readiness.local.env");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("GITHUB_TOKEN");
    expect(output).not.toContain("VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE");
    expect(output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(output).not.toContain("providers configure --profiles-path");
  });

  test("renders exact provider setup commands only in details mode", () => {
    const output = renderConnectCommandResult(connectCommand({ showDetails: true }));

    expect(output).toContain("ANTHROPIC_API_KEY");
    expect(output).toContain("OPENROUTER_API_KEY");
    expect(output).toContain("VIVARIUM_OAI_COMPAT_API_KEY");
    expect(output).toContain("https://openrouter.ai/api/v1");
    expect(output).toContain("vivarium providers configure --profiles-path");
    expect(output).toContain("vivarium providers smoke --profiles-path");
    expect(output).not.toContain("Re-run with --details");
  });

  test("summarizes provider readiness from a setup file without raw keys", () => {
    const output = renderConnectCommandResult(
      connectCommand({
        envFilePath: "live-readiness.local.env",
        env: {
          VIVARIUM_AGENT_REPO_NAME: "",
          VIVARIUM_WORLD_REPO_NAME: "<final-world-repo>",
          VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
          VIVARIUM_PRIVATE_WORLD_REF: "",
          GITHUB_TOKEN: "<redacted-github-token>",
          VIVARIUM_GITHUB_OWNER: "owner",
          VIVARIUM_GITHUB_REPOSITORY_ID: "",
          VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_live",
          ANTHROPIC_API_KEY: "anthropic-key",
          VIVARIUM_ANTHROPIC_MODEL: "claude-sonnet-4-6",
          VIVARIUM_ANTHROPIC_CONTEXT_WINDOW: "1000000",
          OPENROUTER_API_KEY: "<redacted-openrouter-key>",
          VIVARIUM_OPENROUTER_MODEL: "",
          VIVARIUM_OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
          VIVARIUM_OPENROUTER_CONTEXT_WINDOW: "0",
          VIVARIUM_OAI_COMPAT_API_KEY: "private-key",
          VIVARIUM_OAI_COMPAT_BASE_URL: "https://private.example/v1",
          VIVARIUM_OAI_COMPAT_MODEL: "private-model",
          VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW: "128000",
          VIVARIUM_CREDENTIALS_PATH: "/tmp/credentials.enc",
          VIVARIUM_CREDENTIALS_MASTER_KEY: "master-key",
          VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
          VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE: "<redacted-internal-api-token>",
          VIVARIUM_INTERNAL_API_HEALTH_URL: "",
          VIVARIUM_V1_EVIDENCE_PATH: "/tmp/v1-evidence.json",
        },
        pathExists: () => false,
      }),
    );

    expect(output).toContain("Setup file: live-readiness.local.env");
    expect(output).toContain("Names/world readiness: 1/4 ready");
    expect(output).toContain("[needs] Names and worlds: agent repo name, world repo name, private world ref");
    expect(output).toContain("GitHub/public release readiness: 2/4 ready");
    expect(output).toContain("[needs] GitHub/public release: token, repository ID");
    expect(output).toContain("Provider readiness: 2/3 ready");
    expect(output).toContain("[ready] Anthropic");
    expect(output).toContain("[needs] OpenRouter: API key, model, context window");
    expect(output).toContain("[ready] Private OpenAI-compatible");
    expect(output).toContain("Internal credential readiness: 3/5 ready");
    expect(output).toContain("[needs] Internal credential: credential value, health URL");
    expect(output).toContain("V1 evidence readiness: 1/2 ready");
    expect(output).toContain("[needs] V1 evidence file: evidence manifest file");
    expect(output).toContain("doctor --live checks the required v1 evidence content");
    expect(output).toContain(
      "Run vivarium setup live for generated local files, open vivarium connect signup for account/secret handoff, or use vivarium connect fill for scripted updates. Then run vivarium connect setup --confirm-write. If evidence is still missing, run vivarium proof init before vivarium proof.",
    );
    expect(output).not.toContain(
      "Run vivarium setup live for generated local files, or vivarium connect fill for scripted updates. Then run vivarium connect setup --confirm-write.",
    );
    expect(output).not.toContain("Then run vivarium proof init and vivarium connect setup");
    expect(output).not.toContain("Add the evidence manifest");
    expect(output).not.toContain("or edit live-readiness.local.env locally");
    expect(output).toContain("vivarium connect");
    expect(output).toContain("vivarium connect signup");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain(
      [
        "  [1] Prepare live readiness",
        "      vivarium setup live",
        "      vivarium connect signup",
        "      vivarium connect",
        "      vivarium connect fill",
        "      vivarium connect setup --confirm-write",
      ].join("\n"),
    );
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain(
      [
        "  [3] Prepare live evidence",
        "      vivarium proof init",
        "      vivarium proof",
      ].join("\n"),
    );
    expect(output).not.toContain("vivarium live evidence-init --path /tmp/v1-evidence.json");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("VIVARIUM_AGENT_REPO_NAME");
    expect(output).not.toContain("GITHUB_TOKEN");
    expect(output).not.toContain("OPENROUTER_API_KEY");
    expect(output).not.toContain("VIVARIUM_OPENROUTER_MODEL");
    expect(output).not.toContain("VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE");
    expect(output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
  });

  test("shows exact setup fields for readiness only in details mode", () => {
    const output = renderConnectCommandResult(
      connectCommand({
        showDetails: true,
        envFilePath: "live-readiness.local.env",
        env: {
          ANTHROPIC_API_KEY: "anthropic-key",
          VIVARIUM_ANTHROPIC_MODEL: "claude-sonnet-4-6",
          VIVARIUM_ANTHROPIC_CONTEXT_WINDOW: "1000000",
          VIVARIUM_V1_EVIDENCE_PATH: "/tmp/v1-evidence.json",
        },
        pathExists: () => false,
      }),
    );

    expect(output).toContain("ANTHROPIC_API_KEY: set");
    expect(output).toContain("OPENROUTER_API_KEY: needs value");
    expect(output).toContain("VIVARIUM_OPENROUTER_MODEL: needs value");
    expect(output).toContain("VIVARIUM_OAI_COMPAT_BASE_URL: needs value");
    expect(output).toContain("VIVARIUM_CREDENTIALS_PATH: needs value");
    expect(output).toContain("VIVARIUM_INTERNAL_API_HEALTH_URL: needs value");
    expect(output).toContain("VIVARIUM_V1_EVIDENCE_PATH: set");
    expect(output).toContain("Evidence file: needs value");
  });

  test("fills a readiness file through friendly labels without printing raw keys", () => {
    const root = mkdtempSync(join(tmpdir(), "connect-fill-"));
    const envPath = join(root, "live-readiness.local.env");
    writeFileSync(
      envPath,
      [
        'export ANTHROPIC_API_KEY="<redacted-anthropic-key>"',
        'export OPENROUTER_API_KEY="<redacted-openrouter-key>"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="<redacted-private-oai-compatible-key>"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="<private-oai-compatible-base-url>"',
        'export VIVARIUM_OAI_COMPAT_MODEL="<private-fine-tune-model>"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="<private-context-window>"',
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="<local-master-key>"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="<redacted-internal-api-token>"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="<internal-api-health-url>"',
      ].join("\n"),
      "utf8",
    );

    const result = connectFillCommand({
      envFilePath: envPath,
      values: {
        anthropicApiKey: "anthropic-key",
        openRouterApiKey: "openrouter-key",
        privateOaiCompatApiKey: "private-key",
        privateOaiCompatBaseUrl: "https://private.example/v1",
        privateOaiCompatModel: "private-model",
        privateOaiCompatContextWindow: "128000",
        credentialsMasterKey: "master-key",
        internalApiCredentialValue: "internal-secret",
        internalApiHealthUrl: "https://internal.example/health",
      },
    });
    const output = renderConnectFillCommandResult(result);
    const body = readFileSync(envPath, "utf8");

    expect(result.ok).toBe(true);
    expect(output).toContain("Vivarium Connect Fill");
    expect(output).toContain("Status: written");
    expect(output).toContain("Anthropic: API key");
    expect(output).toContain("OpenRouter: API key");
    expect(output).toContain("Private OpenAI-compatible: API key, base URL, model, context window");
    expect(output).toContain("Internal credential: master key, credential value, health URL");
    expect(output).toContain(`vivarium connect --env-file ${envPath}`);
    expect(output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("VIVARIUM_OAI_COMPAT_API_KEY");
    expect(output).not.toContain("anthropic-key");
    expect(output).not.toContain("internal-secret");
    expect(body).toContain('export ANTHROPIC_API_KEY="anthropic-key"');
    expect(body).toContain('export OPENROUTER_API_KEY="openrouter-key"');
    expect(body).toContain('export VIVARIUM_OAI_COMPAT_BASE_URL="https://private.example/v1"');
    expect(body).toContain('export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="128000"');
    expect(body).toContain('export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"');
  });

  test("shows safe fill examples when no friendly values are supplied", () => {
    const root = mkdtempSync(join(tmpdir(), "connect-fill-empty-"));
    const envPath = join(root, "live-readiness.local.env");
    const original = 'export ANTHROPIC_API_KEY="<redacted-anthropic-key>"\n';
    writeFileSync(envPath, original, "utf8");

    const result = connectFillCommand({ envFilePath: envPath, values: {} });
    const output = renderConnectFillCommandResult(result);

    expect(result.ok).toBe(false);
    expect(readFileSync(envPath, "utf8")).toBe(original);
    expect(output).toContain("Status: blocked");
    expect(output).toContain("Signup links:");
    expect(output).toContain("Anthropic: https://console.anthropic.com/settings/keys");
    expect(output).toContain("OpenRouter: https://openrouter.ai/keys");
    expect(output).toContain("Fill examples:");
    const lines = output.split("\n");
    const fillExampleLine = lines.findIndex((line) =>
      line.includes(`vivarium connect fill --env-file ${envPath}`),
    );
    const secretsDirLine = lines.findIndex((line) =>
      line.includes("--secrets-dir ~/.vivarium/secrets"),
    );
    expect(fillExampleLine).toBeGreaterThan(-1);
    expect(secretsDirLine).toBeGreaterThan(-1);
    expect(lines[fillExampleLine]?.trimEnd().endsWith("\\")).toBe(true);
    expect(lines[fillExampleLine + 1]?.trimEnd().endsWith("\\")).toBe(true);
    expect(lines[secretsDirLine]?.trimEnd().endsWith("\\")).toBe(true);
    expect(output).toContain("--secrets-dir ~/.vivarium/secrets \\");
    expect(output).toContain("--setup-dir ~/.vivarium/live \\");
    expect(output).toContain("--private-base-url https://private.example/v1");
    expect(output).not.toContain("--anthropic-key-file ~/.vivarium/secrets/anthropic.key");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE");
    expect(output).not.toContain("--anthropic-key anthropic-key");
  });

  test("points missing default fill setup at guided onboarding", () => {
    const root = mkdtempSync(join(tmpdir(), "connect-fill-missing-default-"));
    const previousCwd = process.cwd();
    try {
      process.chdir(root);
      const result = connectFillCommand({
        envFilePath: "live-readiness.local.env",
        values: { anthropicApiKey: "anthropic-key" },
      });
      const output = renderConnectFillCommandResult(result);

      expect(result.ok).toBe(false);
      expect(output).toContain("Status: blocked");
      expect(output).toContain("Reason: Setup file not found. Run vivarium setup live first.");
      expect(output).toContain("vivarium setup live");
      expect(output).toContain("vivarium connect");
      expect(output).not.toContain("vivarium onboard live");
      expect(output).not.toContain("vivarium connect init");
      expect(output).not.toContain("ANTHROPIC_API_KEY");
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("renders blocked connect setup with plain-language missing labels", () => {
    const output = renderConnectSetupCommandResult(
      {
        ok: false,
        written: false,
        missing: ["VIVARIUM_PROVIDER_PROFILES_PATH", "VIVARIUM_CREDENTIALS_PATH"],
        placeholders: [
          "ANTHROPIC_API_KEY",
          "VIVARIUM_OPENROUTER_MODEL",
          "VIVARIUM_OAI_COMPAT_BASE_URL",
          "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
        ],
        invalid: ["VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW", "VIVARIUM_INTERNAL_API_HEALTH_URL"],
      },
      { envFilePath: "live-readiness.local.env" },
    );

    expect(output).toContain("Needs:");
    expect(output).toContain("Signup links:");
    expect(output).toContain("Anthropic: https://console.anthropic.com/settings/keys");
    expect(output).toContain("OpenRouter: https://openrouter.ai/keys");
    expect(output).toContain("Provider setup");
    expect(output).toContain("Anthropic: API key");
    expect(output).toContain("OpenRouter: model");
    expect(output).toContain("Private OpenAI-compatible: base URL, context window");
    expect(output).toContain("Encrypted credentials/internal API");
    expect(output).toContain("Internal credential: credential store path, credential value, health URL");
    expect(output).toContain(
      "Run vivarium setup live for generated local files, open vivarium connect signup for account/secret handoff, or use vivarium connect fill for scripted updates. Then rerun setup.",
    );
    expect(output).not.toContain("or edit live-readiness.local.env locally");
    expect(output).toContain("Use --details only if you need exact setup field names.");
    expect(output).toContain("      vivarium connect signup");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).not.toContain("vivarium connect setup --details");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("VIVARIUM_OAI_COMPAT_BASE_URL");
    expect(output).not.toContain("VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE");
  });

  test("keeps detailed blocked connect setup on the connect surface", () => {
    const output = renderConnectSetupCommandResult(
      {
        ok: false,
        written: false,
        missing: ["VIVARIUM_PROVIDER_PROFILES_PATH"],
        placeholders: ["ANTHROPIC_API_KEY"],
        invalid: ["VIVARIUM_INTERNAL_API_HEALTH_URL"],
      },
      { envFilePath: "live-readiness.local.env", showDetails: true },
    );

    expect(output).toContain("Vivarium Connect Setup");
    expect(output).toContain("Exact setup fields:");
    expect(output).toContain("Missing: VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(output).toContain("Placeholders: ANTHROPIC_API_KEY");
    expect(output).toContain("Invalid: VIVARIUM_INTERNAL_API_HEALTH_URL");
    expect(output).not.toContain("Vivarium Live Setup");
  });

  test("renders blocked smoke checks without raw setup keys by default", async () => {
    const result = await connectSmokeCommand({ env: {} });
    const output = renderConnectSmokeCommandResult(result, {
      envFilePath: "live-readiness.local.env",
    });

    expect(result.ok).toBe(false);
    expect(output).toContain("Vivarium Connect Smoke");
    expect(output).toContain("[blocked] Anthropic provider");
    expect(output).toContain("[blocked] Internal credential");
    expect(output).toContain("vivarium connect");
    expect(output).toContain("vivarium connect signup");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain(
      [
        "  [1] Prepare live readiness",
        "      vivarium connect",
        "      vivarium connect signup",
        "      vivarium connect fill",
        "      vivarium connect setup --confirm-write",
      ].join("\n"),
    );
    expect(output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(output).not.toContain("ANTHROPIC_API_KEY");
    expect(output).not.toContain("VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE");
  });

  test("includes the missing credential value in internal credential smoke blockers", async () => {
    const root = mkdtempSync(join(tmpdir(), "connect-smoke-missing-credential-value-"));
    const credentialsPath = join(root, "credentials.enc");
    writeFileSync(credentialsPath, "", "utf8");

    const result = await connectSmokeCommand({
      env: {
        VIVARIUM_CREDENTIALS_PATH: credentialsPath,
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
      },
      pathExists: (path) => path === credentialsPath,
    });
    const output = renderConnectSmokeCommandResult(result, {
      envFilePath: "live-readiness.local.env",
    });

    expect(result.ok).toBe(false);
    expect(output).toContain("[blocked] Internal credential: needs master key, credential value, health URL");
    expect(output).toContain("vivarium connect fill");
    expect(output).not.toContain("VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE");
  });

  test("runs provider and internal credential smokes from a filled setup file", async () => {
    const root = mkdtempSync(join(tmpdir(), "connect-smoke-"));
    const env = {
      VIVARIUM_PROVIDER_PROFILES_PATH: join(root, "provider-profiles.json"),
      ANTHROPIC_API_KEY: "anthropic-key",
      OPENROUTER_API_KEY: "openrouter-key",
      VIVARIUM_OAI_COMPAT_API_KEY: "private-key",
      VIVARIUM_ANTHROPIC_PROVIDER_PROFILE: "anthropic-main",
      VIVARIUM_ANTHROPIC_MODEL: "claude-sonnet-4-6",
      VIVARIUM_ANTHROPIC_CONTEXT_WINDOW: "1000000",
      VIVARIUM_OPENROUTER_PROVIDER_PROFILE: "openrouter",
      VIVARIUM_OPENROUTER_MODEL: "openrouter/auto",
      VIVARIUM_OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
      VIVARIUM_OPENROUTER_CONTEXT_WINDOW: "2000000",
      VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE: "private-finetune",
      VIVARIUM_OAI_COMPAT_BASE_URL: "https://private.example/v1",
      VIVARIUM_OAI_COMPAT_MODEL: "private-model",
      VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW: "128000",
      VIVARIUM_CREDENTIALS_PATH: join(root, "credentials.enc"),
      VIVARIUM_CREDENTIALS_MASTER_KEY: "test-master-key",
      VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
      VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE: "internal-secret",
      VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
    };

    expect(liveSetupCommand({ env, confirmWrite: true }).ok).toBe(true);

    const result = await connectSmokeCommand({
      env,
      providerFetch: async (url) => providerSmokeResponse(url),
      credentialFetch: async () => Response.json({ ok: true }),
    });
    const output = renderConnectSmokeCommandResult(result, {
      envFilePath: "live-readiness.local.env",
    });

    expect(result.ok).toBe(true);
    expect(output).toContain("[ok] Anthropic provider");
    expect(output).toContain("[ok] OpenRouter provider");
    expect(output).toContain("[ok] Private OpenAI-compatible provider");
    expect(output).toContain("[ok] Internal credential");
    expect(output).toContain("vivarium proof");
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("internal-secret");
    expect(output).not.toContain("anthropic-key");
  });

  test("reports missing generated setup files before running smokes", async () => {
    const root = mkdtempSync(join(tmpdir(), "connect-smoke-missing-files-"));
    let providerFetchCalled = false;
    let credentialFetchCalled = false;
    const env = {
      VIVARIUM_PROVIDER_PROFILES_PATH: join(root, "missing-provider-profiles.json"),
      ANTHROPIC_API_KEY: "anthropic-key",
      OPENROUTER_API_KEY: "openrouter-key",
      VIVARIUM_OAI_COMPAT_API_KEY: "private-key",
      VIVARIUM_ANTHROPIC_PROVIDER_PROFILE: "anthropic-main",
      VIVARIUM_ANTHROPIC_MODEL: "claude-sonnet-4-6",
      VIVARIUM_ANTHROPIC_CONTEXT_WINDOW: "1000000",
      VIVARIUM_OPENROUTER_PROVIDER_PROFILE: "openrouter",
      VIVARIUM_OPENROUTER_MODEL: "openrouter/auto",
      VIVARIUM_OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
      VIVARIUM_OPENROUTER_CONTEXT_WINDOW: "2000000",
      VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE: "private-finetune",
      VIVARIUM_OAI_COMPAT_BASE_URL: "https://private.example/v1",
      VIVARIUM_OAI_COMPAT_MODEL: "private-model",
      VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW: "128000",
      VIVARIUM_CREDENTIALS_PATH: join(root, "missing-credentials.enc"),
      VIVARIUM_CREDENTIALS_MASTER_KEY: "test-master-key",
      VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
      VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE: "internal-secret",
      VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
    };

    const result = await connectSmokeCommand({
      env,
      providerFetch: async () => {
        providerFetchCalled = true;
        return providerSmokeResponse("https://api.anthropic.com/v1/messages");
      },
      credentialFetch: async () => {
        credentialFetchCalled = true;
        return Response.json({ ok: true });
      },
    });
    const output = renderConnectSmokeCommandResult(result, {
      envFilePath: "live-readiness.local.env",
    });

    expect(result.ok).toBe(false);
    expect(providerFetchCalled).toBe(false);
    expect(credentialFetchCalled).toBe(false);
    expect(output).toContain("[blocked] Anthropic provider: needs profile file");
    expect(output).toContain("[blocked] Internal credential: needs credential store file");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).not.toContain("vivarium connect fill");
    expect(output).not.toContain("Provider profile not found");
    expect(output).not.toContain("Missing credential");
    expect(output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(output).not.toContain("VIVARIUM_CREDENTIALS_PATH");
  });
});
