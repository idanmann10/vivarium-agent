import type { Capability, CostClass, Episode, Prediction } from "../../../../packages/core/src/index.js";
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
import { createLocalWorldReader, searchWorlds, type LocalWorldReader } from "../../../../packages/world/src/index.js";
import { renderVivariumGlobe } from "./branding.js";
import { resolveProviderProfile } from "./providers.js";
import { listWorldSubscriptionsCommand } from "./world.js";

export type RunProviderKind = "local" | "anthropic" | "openai" | "openai-compat";

export interface RunCommandOptions {
  readonly goal: string;
  readonly agentName?: string;
  readonly domain?: string;
  readonly worldRoot?: string;
  readonly worldSubscriptionsPath?: string;
  readonly statePath?: string;
  readonly forceFailure?: boolean;
  readonly providerKind?: RunProviderKind;
  readonly providerApiKeyEnv?: string;
  readonly providerModel?: string;
  readonly providerBaseUrl?: string;
  readonly providerProfilesPath?: string;
  readonly providerProfile?: string;
  readonly statusCommand?: string;
  readonly availableToolsets?: readonly string[];
  readonly availableTools?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: ProviderFetch;
}

export function describeRunCommand(options: RunCommandOptions): string {
  return options.domain === undefined ? options.goal : `${options.domain}: ${options.goal}`;
}

export interface RunCommandResult {
  readonly success: boolean;
  readonly agentName: string;
  readonly runId: string | null;
  readonly memoryPath?: string;
  readonly statusCommand?: string;
  readonly provider: {
    readonly kind: string;
    readonly id: string;
    readonly model: string | null;
  };
  readonly episodeKinds: readonly Episode["kind"][];
  readonly transparency: RunTransparencySummary;
  readonly error?: string;
}

export interface RunValidationSummary {
  readonly score: number;
  readonly passed: boolean;
  readonly reasons: readonly string[];
}

export interface RunHighSurpriseSummary {
  readonly about: string;
  readonly expected: string;
  readonly confidence: number;
  readonly actual: string;
  readonly magnitude: number;
  readonly notes?: string;
}

export interface RunTransparencySummary {
  readonly plan: string | null;
  readonly outcome: string | null;
  readonly prediction: Prediction | null;
  readonly validation: RunValidationSummary | null;
  readonly consulted: {
    readonly skills: readonly string[];
    readonly traces: readonly string[];
  };
  readonly highSurprises: readonly RunHighSurpriseSummary[];
}

interface ConfiguredRunProvider {
  readonly provider: LocalProvider;
  readonly summary: RunCommandResult["provider"];
}

interface RunProviderConfig {
  readonly kind: RunProviderKind;
  readonly id: string;
  readonly apiKeyEnv?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly capabilities: readonly Capability[];
  readonly costClass: CostClass;
}

function localProvider(): ConfiguredRunProvider {
  return {
    provider: createLocalProvider({ id: "local", costClass: "medium", capabilities: ["chat", "json_mode"] }),
    summary: { kind: "local", id: "local", model: null },
  };
}

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function providerConfigError(kind: string, id: string, model: string | null | undefined, error: string): RunCommandResult {
  return {
    success: false,
    agentName: "local-agent",
    runId: null,
    provider: { kind, id, model: model ?? null },
    episodeKinds: [],
    transparency: emptyRunTransparency(),
    error,
  };
}

function emptyRunTransparency(): RunTransparencySummary {
  return {
    plan: null,
    outcome: null,
    prediction: null,
    validation: null,
    consulted: { skills: [], traces: [] },
    highSurprises: [],
  };
}

function findLatestEpisode<Kind extends Episode["kind"]>(
  episodes: readonly Episode[],
  kind: Kind,
): Extract<Episode, { readonly kind: Kind }> | undefined {
  for (let index = episodes.length - 1; index >= 0; index -= 1) {
    const episode = episodes[index];
    if (episode?.kind === kind) {
      return episode as Extract<Episode, { readonly kind: Kind }>;
    }
  }

  return undefined;
}

export function summarizeRunEpisodes(episodes: readonly Episode[]): RunTransparencySummary {
  const plan = findLatestEpisode(episodes, "plan");
  const observation = findLatestEpisode(episodes, "observation");
  const prediction = findLatestEpisode(episodes, "prediction");
  const validation = findLatestEpisode(episodes, "validation");
  const highSurprises = episodes
    .filter((episode): episode is Extract<Episode, { readonly kind: "surprise" }> => episode.kind === "surprise")
    .filter((episode) => episode.magnitude > 0.4)
    .map((episode) => ({
      about: episode.prediction.about,
      expected: episode.prediction.expected,
      confidence: episode.prediction.confidence,
      actual: episode.actual,
      magnitude: episode.magnitude,
      ...(episode.notes === undefined ? {} : { notes: episode.notes }),
    }));

  return {
    plan: plan?.plan ?? null,
    outcome: summarizeOutcome(observation?.content),
    prediction: prediction?.prediction ?? null,
    validation:
      validation === undefined
        ? null
        : {
            score: validation.score,
            passed: validation.passed,
            reasons: validation.reasons,
          },
    consulted: {
      skills: plan?.skillsLoaded.map(String) ?? [],
      traces: plan?.tracesLoaded.map(String) ?? [],
    },
    highSurprises,
  };
}

function summarizeOutcome(content: unknown): string | null {
  if (content === undefined || content === null) {
    return null;
  }

  const raw = typeof content === "string" ? content : JSON.stringify(content);
  if (raw === undefined) {
    return null;
  }
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.length <= 240 ? normalized : `${normalized.slice(0, 237)}...`;
}

function isRunProviderKind(value: string): value is RunProviderKind {
  return value === "local" || value === "anthropic" || value === "openai" || value === "openai-compat";
}

function configuredProviderFrom(config: RunProviderConfig, options: RunCommandOptions): ConfiguredRunProvider | RunCommandResult {
  if (config.kind === "local") {
    return localProvider();
  }

  if (config.apiKeyEnv === undefined || config.apiKeyEnv.length === 0) {
    return providerConfigError(config.kind, config.id, config.model, "Missing --provider-api-key-env for configured provider run");
  }
  if (config.model === undefined || config.model.length === 0) {
    return providerConfigError(config.kind, config.id, config.model, "Missing --provider-model for configured provider run");
  }

  const apiKey = (options.env ?? process.env)[config.apiKeyEnv];
  if (apiKey === undefined || apiKey.length === 0) {
    return providerConfigError(config.kind, config.id, config.model, `Missing provider environment variable: ${config.apiKeyEnv}`);
  }

  const base = {
    id: config.id,
    apiKey,
    model: config.model,
    costClass: config.costClass,
    capabilities: config.capabilities,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  };

  if (config.kind === "openai") {
    return { provider: createOpenAIProvider(base), summary: { kind: config.kind, id: base.id, model: config.model } };
  }

  if (config.kind === "anthropic") {
    return { provider: createAnthropicProvider(base), summary: { kind: config.kind, id: base.id, model: config.model } };
  }

  if (config.baseUrl === undefined || config.baseUrl.length === 0) {
    return providerConfigError(config.kind, config.id, config.model, "Missing --provider-base-url for openai-compat provider");
  }

  return {
    provider: createOpenAICompatProvider({ ...base, baseUrl: config.baseUrl }),
    summary: { kind: config.kind, id: base.id, model: config.model },
  };
}

function configuredProvider(options: RunCommandOptions): ConfiguredRunProvider | RunCommandResult {
  if (options.providerProfile !== undefined) {
    const id = `run-${options.providerProfile}`;
    if (options.providerProfilesPath === undefined) {
      return providerConfigError(options.providerProfile, id, null, "Missing --provider-profiles-path for provider profile");
    }

    const profile = resolveProviderProfile({
      profilesPath: options.providerProfilesPath,
      profile: options.providerProfile,
    });
    if (profile === undefined) {
      return providerConfigError(options.providerProfile, id, null, `Provider profile not found: ${options.providerProfile}`);
    }

    return configuredProviderFrom(
      {
        kind: profile.kind,
        id,
        apiKeyEnv: profile.apiKeyEnv,
        model: profile.model,
        ...(profile.baseUrl === undefined ? {} : { baseUrl: profile.baseUrl }),
        capabilities: profile.capabilities,
        costClass: profile.costClass,
      },
      options,
    );
  }

  const rawKind = options.providerKind ?? "local";
  if (!isRunProviderKind(rawKind)) {
    return providerConfigError(rawKind, `run-${rawKind}`, options.providerModel, `Unsupported --provider-kind: ${rawKind}`);
  }

  return configuredProviderFrom(
    {
      kind: rawKind,
      id: `run-${rawKind}`,
      ...(options.providerApiKeyEnv === undefined ? {} : { apiKeyEnv: options.providerApiKeyEnv }),
      ...(options.providerModel === undefined ? {} : { model: options.providerModel }),
      ...(options.providerBaseUrl === undefined ? {} : { baseUrl: options.providerBaseUrl }),
      capabilities: ["chat", "json_mode"],
      costClass: "medium",
    },
    options,
  );
}

function createRunWorldReader(options: RunCommandOptions): LocalWorldReader {
  if (options.worldSubscriptionsPath !== undefined) {
    const worlds = listWorldSubscriptionsCommand({ subscriptionsPath: options.worldSubscriptionsPath }).subscriptions;
    return {
      search(request) {
        return searchWorlds({ worlds, ...request });
      },
    };
  }

  return createLocalWorldReader({ root: options.worldRoot ?? "../the-world" });
}

export async function runCommand(options: RunCommandOptions): Promise<RunCommandResult> {
  const agentName = options.agentName ?? "local-agent";
  const selectedProvider = configuredProvider(options);
  if ("success" in selectedProvider) {
    return { ...selectedProvider, agentName };
  }

  const state: StateRepository = options.statePath === undefined ? new InMemoryStateRepository() : new SQLiteStateRepository(options.statePath);
  const tools = createSelfTools({
    state,
    world: createRunWorldReader(options),
  });
  const request = {
    goal: options.goal,
    domain: options.domain ?? "coding",
    agentName,
    provider: selectedProvider.provider,
    tools,
    availableToolsets: options.availableToolsets ?? [],
    availableTools: options.availableTools ?? [],
  };
  const result = await runGoal(
    options.forceFailure === undefined ? request : { ...request, forceFailure: options.forceFailure },
  );
  const episodes = state.listEpisodes(result.runId);
  const episodeKinds = episodes.map((episode) => episode.kind);
  const transparency = summarizeRunEpisodes(episodes);
  if (state instanceof SQLiteStateRepository) {
    state.close();
  }

  return {
    success: result.success,
    agentName,
    runId: String(result.runId),
    ...(options.statePath === undefined ? {} : { memoryPath: options.statePath }),
    statusCommand:
      options.statusCommand ??
      (options.statePath === undefined
        ? "vivarium status"
        : `vivarium status --state-path ${shellQuote(options.statePath)}`),
    provider: selectedProvider.summary,
    episodeKinds,
    transparency,
  };
}

function renderProviderSummary(provider: RunCommandResult["provider"]): string {
  return provider.model === null ? provider.kind : `${provider.kind} (${provider.model})`;
}

function renderValidationSummary(validation: RunValidationSummary | null): string {
  if (validation === null) {
    return "Validation: not run";
  }

  return `Validation: ${validation.passed ? "pass" : "fail"} (${validation.score})`;
}

function renderPredictionSummary(prediction: Prediction | null): readonly string[] {
  if (prediction === null) {
    return [];
  }

  return [
    `Prediction: ${prediction.about}`,
    `Confidence: ${prediction.confidence}`,
  ];
}

function renderOutcomeSummary(outcome: string | null): readonly string[] {
  return outcome === null ? [] : [`Outcome: ${outcome}`];
}

function renderRunReceipt(result: RunCommandResult): readonly string[] {
  if (!result.success || result.runId === null || result.memoryPath === undefined) {
    return [];
  }

  const score = result.transparency.validation?.score;
  const scoreText = score === undefined ? "." : ` and score ${score}.`;
  const statusCommand = result.statusCommand ?? "vivarium status";
  return [
    `Recorded: ${statusCommand} will show Run ID ${result.runId} with success state${scoreText}`,
  ];
}

function renderRunGuidance(result: RunCommandResult): readonly string[] {
  const statusCommand = result.statusCommand ?? "vivarium status";
  if (result.success) {
    return [
      "Next commands:",
      "  vivarium local run --goal \"try another small coding task\"",
      `  ${statusCommand}`,
      "  vivarium launch handoff",
      "  vivarium model",
    ];
  }

  if (isProviderSetupError(result.error)) {
    return [
      "Next commands:",
      "  vivarium connect signup",
      "  vivarium connect fill",
      "  vivarium connect setup --confirm-write",
      "  vivarium connect smoke",
      "  vivarium local run",
    ];
  }

  return [
    "Next command:",
    "  vivarium doctor --live",
  ];
}

function isProviderSetupError(error: string | undefined): boolean {
  return (
    error?.startsWith("Missing --provider-") === true ||
    error?.startsWith("Missing provider environment variable:") === true ||
    error?.startsWith("Missing --provider-profiles-path") === true ||
    error?.startsWith("Provider profile not found:") === true
  );
}

function renderRunError(error: string): string {
  return isProviderSetupError(error)
    ? "Provider credentials are not connected for this run."
    : error;
}

export function renderRunCommandResult(result: RunCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Run",
    "------------",
    `Status: ${result.success ? "success" : "blocked"}`,
    `Agent: ${result.agentName}`,
    `Run ID: ${result.runId ?? "not started"}`,
    `Provider: ${renderProviderSummary(result.provider)}`,
    ...(result.memoryPath === undefined ? [] : [`Memory: ${result.memoryPath}`]),
    `Episodes: ${result.episodeKinds.length === 0 ? "none" : result.episodeKinds.join(", ")}`,
    `Consulted skills: ${result.transparency.consulted.skills.length}`,
    `Consulted traces: ${result.transparency.consulted.traces.length}`,
    renderValidationSummary(result.transparency.validation),
    ...renderOutcomeSummary(result.transparency.outcome),
    ...renderPredictionSummary(result.transparency.prediction),
    `High surprises: ${result.transparency.highSurprises.length}`,
    ...renderRunReceipt(result),
    ...(result.error === undefined ? [] : ["", `Reason: ${renderRunError(result.error)}`]),
    "",
    ...renderRunGuidance(result),
    "",
  ].join("\n");
}
