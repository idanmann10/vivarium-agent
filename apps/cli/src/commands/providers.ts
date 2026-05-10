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
  const profile = {
    name: options.name,
    kind: options.kind,
    apiKeyEnv: options.apiKeyEnv,
    model: options.model,
    capabilities: options.capabilities,
    contextWindow: options.contextWindow,
    costClass: options.costClass,
  };
  const next = normalizeProfiles([
    ...existing.filter((candidate) => candidate.name !== options.name),
    options.baseUrl === undefined ? profile : { ...profile, baseUrl: options.baseUrl },
  ]);

  writeProviderProfiles(options.profilesPath, next);
  return { profiles: next };
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
