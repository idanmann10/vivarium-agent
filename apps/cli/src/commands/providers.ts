import {
  createAnthropicProvider,
  createOpenAICompatProvider,
  createOpenAIProvider,
  type LocalProvider,
  type ProviderFetch,
} from "../../../../packages/providers/src/index.js";

export type ProviderSmokeKind = "anthropic" | "openai" | "openai-compat";

export interface ProviderSmokeCommandOptions {
  readonly kind: ProviderSmokeKind;
  readonly apiKeyEnv: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly prompt?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: ProviderFetch;
}

export type ProviderSmokeCommandResult =
  | {
      readonly ok: true;
      readonly kind: ProviderSmokeKind;
      readonly model: string;
      readonly responsePreview: string;
      readonly responseLength: number;
    }
  | {
      readonly ok: false;
      readonly kind: ProviderSmokeKind;
      readonly model: string;
      readonly error: string;
    };

const defaultPrompt = "Return a short provider smoke-test confirmation.";
const previewLimit = 200;

function preview(text: string): string {
  return text.length <= previewLimit ? text : text.slice(0, previewLimit);
}

function providerFor(options: ProviderSmokeCommandOptions, apiKey: string): LocalProvider | string {
  const base = {
    id: `smoke-${options.kind}`,
    apiKey,
    model: options.model,
    costClass: "cheap" as const,
    capabilities: ["chat"] as const,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  };

  if (options.kind === "openai") {
    return createOpenAIProvider(base);
  }

  if (options.kind === "anthropic") {
    return createAnthropicProvider(base);
  }

  if (options.baseUrl === undefined || options.baseUrl.length === 0) {
    return "Missing --base-url for openai-compat provider";
  }

  return createOpenAICompatProvider({ ...base, baseUrl: options.baseUrl });
}

export async function providerSmokeCommand(options: ProviderSmokeCommandOptions): Promise<ProviderSmokeCommandResult> {
  const env = options.env ?? process.env;
  const apiKey = env[options.apiKeyEnv];
  if (apiKey === undefined || apiKey.length === 0) {
    return {
      ok: false,
      kind: options.kind,
      model: options.model,
      error: `Missing provider environment variable: ${options.apiKeyEnv}`,
    };
  }

  const provider = providerFor(options, apiKey);
  if (typeof provider === "string") {
    return { ok: false, kind: options.kind, model: options.model, error: provider };
  }

  try {
    const text = await provider.complete({ kind: "validate", input: options.prompt ?? defaultPrompt });
    return {
      ok: true,
      kind: options.kind,
      model: options.model,
      responsePreview: preview(text),
      responseLength: text.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, kind: options.kind, model: options.model, error: message };
  }
}
