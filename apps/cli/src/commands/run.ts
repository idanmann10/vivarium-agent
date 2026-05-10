import type { Episode } from "../../../../packages/core/src/index.js";
import {
  createAnthropicProvider,
  createLocalProvider,
  createOpenAICompatProvider,
  createOpenAIProvider,
  type LocalProvider,
  type ProviderFetch,
} from "../../../../packages/providers/src/index.js";
import { runGoal } from "../../../../packages/runtime/src/index.js";
import { InMemoryStateRepository, SQLiteStateRepository, type StateRepository } from "../../../../packages/state/src/index.js";
import { createSelfTools } from "../../../../packages/tools/src/index.js";
import { createLocalWorldReader } from "../../../../packages/world/src/index.js";

export type RunProviderKind = "local" | "anthropic" | "openai" | "openai-compat";

export interface RunCommandOptions {
  readonly goal: string;
  readonly domain?: string;
  readonly worldRoot?: string;
  readonly statePath?: string;
  readonly forceFailure?: boolean;
  readonly providerKind?: RunProviderKind;
  readonly providerApiKeyEnv?: string;
  readonly providerModel?: string;
  readonly providerBaseUrl?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: ProviderFetch;
}

export function describeRunCommand(options: RunCommandOptions): string {
  return options.domain === undefined ? options.goal : `${options.domain}: ${options.goal}`;
}

export interface RunCommandResult {
  readonly success: boolean;
  readonly runId: string | null;
  readonly provider: {
    readonly kind: string;
    readonly id: string;
    readonly model: string | null;
  };
  readonly episodeKinds: readonly Episode["kind"][];
  readonly error?: string;
}

interface ConfiguredRunProvider {
  readonly provider: LocalProvider;
  readonly summary: RunCommandResult["provider"];
}

function localProvider(): ConfiguredRunProvider {
  return {
    provider: createLocalProvider({ id: "local", costClass: "medium", capabilities: ["chat", "json_mode"] }),
    summary: { kind: "local", id: "local", model: null },
  };
}

function providerConfigError(kind: RunProviderKind, model: string | undefined, error: string): RunCommandResult {
  return {
    success: false,
    runId: null,
    provider: { kind, id: `run-${kind}`, model: model ?? null },
    episodeKinds: [],
    error,
  };
}

function isRunProviderKind(value: string): value is RunProviderKind {
  return value === "local" || value === "anthropic" || value === "openai" || value === "openai-compat";
}

function configuredProvider(options: RunCommandOptions): ConfiguredRunProvider | RunCommandResult {
  const rawKind = options.providerKind ?? "local";
  if (!isRunProviderKind(rawKind)) {
    return {
      success: false,
      runId: null,
      provider: { kind: rawKind, id: `run-${rawKind}`, model: options.providerModel ?? null },
      episodeKinds: [],
      error: `Unsupported --provider-kind: ${rawKind}`,
    };
  }

  const kind = rawKind;
  if (kind === "local") {
    return localProvider();
  }

  if (options.providerApiKeyEnv === undefined || options.providerApiKeyEnv.length === 0) {
    return providerConfigError(kind, options.providerModel, "Missing --provider-api-key-env for configured provider run");
  }
  if (options.providerModel === undefined || options.providerModel.length === 0) {
    return providerConfigError(kind, options.providerModel, "Missing --provider-model for configured provider run");
  }

  const apiKey = (options.env ?? process.env)[options.providerApiKeyEnv];
  if (apiKey === undefined || apiKey.length === 0) {
    return providerConfigError(kind, options.providerModel, `Missing provider environment variable: ${options.providerApiKeyEnv}`);
  }

  const base = {
    id: `run-${kind}`,
    apiKey,
    model: options.providerModel,
    costClass: "medium" as const,
    capabilities: ["chat", "json_mode"] as const,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  };

  if (kind === "openai") {
    return { provider: createOpenAIProvider(base), summary: { kind, id: base.id, model: options.providerModel } };
  }

  if (kind === "anthropic") {
    return { provider: createAnthropicProvider(base), summary: { kind, id: base.id, model: options.providerModel } };
  }

  if (options.providerBaseUrl === undefined || options.providerBaseUrl.length === 0) {
    return providerConfigError(kind, options.providerModel, "Missing --provider-base-url for openai-compat provider");
  }

  return {
    provider: createOpenAICompatProvider({ ...base, baseUrl: options.providerBaseUrl }),
    summary: { kind, id: base.id, model: options.providerModel },
  };
}

export async function runCommand(options: RunCommandOptions): Promise<RunCommandResult> {
  const selectedProvider = configuredProvider(options);
  if ("success" in selectedProvider) {
    return selectedProvider;
  }

  const state: StateRepository = options.statePath === undefined ? new InMemoryStateRepository() : new SQLiteStateRepository(options.statePath);
  const tools = createSelfTools({
    state,
    world: createLocalWorldReader({ root: options.worldRoot ?? "../the-world" }),
  });
  const request = {
    goal: options.goal,
    domain: options.domain ?? "coding",
    agentName: "local-cli-agent",
    provider: selectedProvider.provider,
    tools,
  };
  const result = await runGoal(
    options.forceFailure === undefined ? request : { ...request, forceFailure: options.forceFailure },
  );
  const episodeKinds = state.listEpisodes(result.runId).map((episode) => episode.kind);
  if (state instanceof SQLiteStateRepository) {
    state.close();
  }

  return {
    success: result.success,
    runId: String(result.runId),
    provider: selectedProvider.summary,
    episodeKinds,
  };
}
