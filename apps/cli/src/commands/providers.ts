import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { Capability, CostClass } from "../../../../packages/core/src/index.js";
import {
  createAnthropicProvider,
  createOpenAICompatProvider,
  createOpenAIProvider,
  type LocalProvider,
  type ProviderFetch,
} from "../../../../packages/providers/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

export type ProviderSmokeKind = "anthropic" | "openai" | "openai-compat";

export interface ProviderProfile {
  readonly name: string;
  readonly kind: ProviderSmokeKind;
  readonly apiKeyEnv: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly capabilities: readonly Capability[];
  readonly contextWindow: number;
  readonly costClass: CostClass;
}

export interface ProviderProfilesCommandOptions {
  readonly profilesPath: string;
}

export interface ConfigureProviderProfileCommandOptions extends ProviderProfilesCommandOptions {
  readonly name: string;
  readonly kind: ProviderSmokeKind;
  readonly apiKeyEnv: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly capabilities: readonly Capability[];
  readonly contextWindow: number;
  readonly costClass: CostClass;
}

export interface ProviderProfilesCommandResult {
  readonly profiles: readonly ProviderProfile[];
}

export interface ProviderSmokeCommandOptions {
  readonly kind?: ProviderSmokeKind;
  readonly apiKeyEnv?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly profilesPath?: string;
  readonly profile?: string;
  readonly prompt?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: ProviderFetch;
}

export type ProviderSmokeCommandResult =
  | {
      readonly ok: true;
      readonly kind: string;
      readonly model: string;
      readonly responsePreview: string;
      readonly responseLength: number;
    }
  | {
      readonly ok: false;
      readonly kind: string;
      readonly model: string | null;
      readonly error: string;
    };

const defaultPrompt = "Return a short provider smoke-test confirmation.";
const previewLimit = 200;

interface ProviderProfilesFile {
  readonly profiles?: readonly Partial<ProviderProfile>[];
}

interface ResolvedProviderConfig {
  readonly id: string;
  readonly kind: ProviderSmokeKind;
  readonly apiKeyEnv: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly capabilities: readonly Capability[];
  readonly costClass: CostClass;
}

function preview(text: string): string {
  return text.length <= previewLimit ? text : text.slice(0, previewLimit);
}

function normalizeProfiles(profiles: readonly ProviderProfile[]): readonly ProviderProfile[] {
  return [...profiles].toSorted((left, right) => left.name.localeCompare(right.name));
}

function hasOnlySafeProviderFieldChars(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    const isAlpha = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    const isDigit = code >= 48 && code <= 57;
    const isSymbol = char === "." || char === "/" || char === "_" || char === "-" || char === ":" || char === "@";
    if (!isAlpha && !isDigit && !isSymbol) {
      return false;
    }
  }
  return true;
}

function assertSafeProviderField(profileName: string, field: "apiKeyEnv" | "model", value: string): void {
  if (value.trim() !== value || !hasOnlySafeProviderFieldChars(value)) {
    throw new Error(`Provider profile ${profileName} has unsafe ${field}`);
  }
}

function assertSafeProviderBaseUrl(profileName: string, baseUrl: string | undefined): void {
  if (baseUrl === undefined) {
    return;
  }
  try {
    const parsed = new URL(baseUrl);
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username.length > 0 || parsed.password.length > 0) {
      throw new Error("unsupported provider base URL");
    }
  } catch {
    throw new Error(`Provider profile ${profileName} has unsafe baseUrl`);
  }
}

function parseProviderProfile(raw: Partial<ProviderProfile>, index: number): ProviderProfile {
  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    throw new Error(`Provider profile ${index + 1} is missing name`);
  }
  if (raw.kind !== "anthropic" && raw.kind !== "openai" && raw.kind !== "openai-compat") {
    throw new Error(`Provider profile ${raw.name} has unsupported kind`);
  }
  if (typeof raw.apiKeyEnv !== "string" || raw.apiKeyEnv.trim().length === 0) {
    throw new Error(`Provider profile ${raw.name} is missing apiKeyEnv`);
  }
  if (typeof raw.model !== "string" || raw.model.trim().length === 0) {
    throw new Error(`Provider profile ${raw.name} is missing model`);
  }
  assertSafeProviderField(raw.name, "apiKeyEnv", raw.apiKeyEnv);
  assertSafeProviderField(raw.name, "model", raw.model);
  assertSafeProviderBaseUrl(raw.name, raw.baseUrl);
  if (!Array.isArray(raw.capabilities) || raw.capabilities.length === 0) {
    throw new Error(`Provider profile ${raw.name} is missing capabilities`);
  }
  if (typeof raw.contextWindow !== "number" || !Number.isInteger(raw.contextWindow)) {
    throw new Error(`Provider profile ${raw.name} is missing integer contextWindow`);
  }
  if (raw.costClass !== "cheap" && raw.costClass !== "medium" && raw.costClass !== "expensive") {
    throw new Error(`Provider profile ${raw.name} has unsupported costClass`);
  }

  const profile = {
    name: raw.name,
    kind: raw.kind,
    apiKeyEnv: raw.apiKeyEnv,
    model: raw.model,
    capabilities: raw.capabilities,
    contextWindow: raw.contextWindow,
    costClass: raw.costClass,
  };

  return raw.baseUrl === undefined ? profile : { ...profile, baseUrl: raw.baseUrl };
}

function readProviderProfiles(profilesPath: string): readonly ProviderProfile[] {
  if (!existsSync(profilesPath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(profilesPath, "utf8")) as ProviderProfilesFile;
  return normalizeProfiles((parsed.profiles ?? []).map(parseProviderProfile));
}

function writeProviderProfiles(profilesPath: string, profiles: readonly ProviderProfile[]): void {
  mkdirSync(dirname(profilesPath), { recursive: true });
  writeFileSync(profilesPath, `${JSON.stringify({ profiles: normalizeProfiles(profiles) }, null, 2)}\n`, "utf8");
}

export function listProviderProfilesCommand(options: ProviderProfilesCommandOptions): ProviderProfilesCommandResult {
  return { profiles: readProviderProfiles(options.profilesPath) };
}

export function configureProviderProfileCommand(options: ConfigureProviderProfileCommandOptions): ProviderProfilesCommandResult {
  const existing = readProviderProfiles(options.profilesPath);
  const profile = parseProviderProfile({
    name: options.name,
    kind: options.kind,
    apiKeyEnv: options.apiKeyEnv,
    model: options.model,
    ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
    capabilities: options.capabilities,
    contextWindow: options.contextWindow,
    costClass: options.costClass,
  }, 0);
  const next = normalizeProfiles([
    ...existing.filter((candidate) => candidate.name !== options.name),
    profile,
  ]);

  writeProviderProfiles(options.profilesPath, next);
  return { profiles: next };
}

function renderProviderProfile(profile: ProviderProfile): readonly string[] {
  return [
    `  ${profile.name}`,
    `    Kind: ${profile.kind}`,
    `    Model: ${profile.model}`,
    `    Key env: ${profile.apiKeyEnv}`,
    ...(profile.baseUrl === undefined ? [] : [`    Base URL: ${profile.baseUrl}`]),
    `    Capabilities: ${profile.capabilities.join(", ")}`,
    `    Context window: ${profile.contextWindow}`,
    `    Cost: ${profile.costClass}`,
  ];
}

export function renderProviderProfilesCommandResult(result: ProviderProfilesCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Providers",
    "------------------",
    `Profiles: ${result.profiles.length}`,
    ...(result.profiles.length === 0
      ? [
          "",
          "Next command:",
          "  vivarium live setup --env-file live-readiness.local.env --confirm-write",
        ]
      : ["", ...result.profiles.flatMap(renderProviderProfile)]),
    "",
  ].join("\n");
}

export function resolveProviderProfile(options: {
  readonly profilesPath: string;
  readonly profile: string;
}): ProviderProfile | undefined {
  return readProviderProfiles(options.profilesPath).find((candidate) => candidate.name === options.profile);
}

function smokeConfig(options: ProviderSmokeCommandOptions): ResolvedProviderConfig | ProviderSmokeCommandResult {
  if (options.profile !== undefined) {
    if (options.profilesPath === undefined) {
      return { ok: false, kind: options.profile, model: null, error: "Missing --profiles-path for provider profile" };
    }

    const profile = resolveProviderProfile({ profilesPath: options.profilesPath, profile: options.profile });
    if (profile === undefined) {
      return { ok: false, kind: options.profile, model: null, error: `Provider profile not found: ${options.profile}` };
    }

    return {
      id: `smoke-${profile.name}`,
      kind: profile.kind,
      apiKeyEnv: profile.apiKeyEnv,
      model: profile.model,
      ...(profile.baseUrl === undefined ? {} : { baseUrl: profile.baseUrl }),
      capabilities: profile.capabilities,
      costClass: profile.costClass,
    };
  }

  if (options.kind === undefined) {
    return { ok: false, kind: "unknown", model: options.model ?? null, error: "Missing --kind for provider smoke" };
  }
  if (options.apiKeyEnv === undefined || options.apiKeyEnv.length === 0) {
    return { ok: false, kind: options.kind, model: options.model ?? null, error: "Missing --api-key-env for provider smoke" };
  }
  if (options.model === undefined || options.model.length === 0) {
    return { ok: false, kind: options.kind, model: null, error: "Missing --model for provider smoke" };
  }

  return {
    id: `smoke-${options.kind}`,
    kind: options.kind,
    apiKeyEnv: options.apiKeyEnv,
    model: options.model,
    ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
    capabilities: ["chat"],
    costClass: "cheap",
  };
}

function providerFor(config: ResolvedProviderConfig, apiKey: string, fetch?: ProviderFetch): LocalProvider | string {
  const base = {
    id: config.id,
    apiKey,
    model: config.model,
    costClass: config.costClass,
    capabilities: config.capabilities,
    ...(fetch === undefined ? {} : { fetch }),
  };

  if (config.kind === "openai") {
    return createOpenAIProvider(base);
  }

  if (config.kind === "anthropic") {
    return createAnthropicProvider(base);
  }

  if (config.baseUrl === undefined || config.baseUrl.length === 0) {
    return "Missing --base-url for openai-compat provider";
  }

  return createOpenAICompatProvider({ ...base, baseUrl: config.baseUrl });
}

export async function providerSmokeCommand(options: ProviderSmokeCommandOptions): Promise<ProviderSmokeCommandResult> {
  const config = smokeConfig(options);
  if ("ok" in config) {
    return config;
  }

  const env = options.env ?? process.env;
  const apiKey = env[config.apiKeyEnv];
  if (apiKey === undefined || apiKey.length === 0) {
    return {
      ok: false,
      kind: config.kind,
      model: config.model,
      error: `Missing provider environment variable: ${config.apiKeyEnv}`,
    };
  }

  const provider = providerFor(config, apiKey, options.fetch);
  if (typeof provider === "string") {
    return { ok: false, kind: config.kind, model: config.model, error: provider };
  }

  try {
    const text = await provider.complete({ kind: "validate", input: options.prompt ?? defaultPrompt });
    return {
      ok: true,
      kind: config.kind,
      model: config.model,
      responsePreview: preview(text),
      responseLength: text.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, kind: config.kind, model: config.model, error: message };
  }
}

export function renderProviderSmokeCommandResult(result: ProviderSmokeCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Provider Smoke",
    "-----------------------",
    `Status: ${result.ok ? "ok" : "blocked"}`,
    `Kind: ${result.kind}`,
    `Model: ${result.model ?? "not set"}`,
    ...(result.ok
      ? [
          `Response length: ${result.responseLength}`,
          `Preview: ${result.responsePreview}`,
          "",
          "Next command:",
          "  vivarium doctor --live --env-file live-readiness.local.env",
        ]
      : [
          `Error: ${result.error}`,
          "",
          "Next command:",
          "  Export the missing provider value, then rerun provider smoke.",
        ]),
    "",
  ].join("\n");
}
