import type { Capability, CostClass } from "../../core/src/index.js";
import type { LocalProvider, ProviderCompletionRequest } from "./local.js";

export type ProviderFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface HttpProviderOptions {
  readonly id: string;
  readonly apiKey: string;
  readonly model: string;
  readonly costClass: CostClass;
  readonly capabilities: readonly Capability[];
  readonly fetch?: ProviderFetch;
}

export interface OpenAICompatProviderOptions extends HttpProviderOptions {
  readonly baseUrl: string;
}

function taskPrompt(request: ProviderCompletionRequest): string {
  return `[${request.kind}] ${request.input}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function parseJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Provider request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

function openAIText(json: unknown): string {
  const choices = (json as { readonly choices?: readonly { readonly message?: { readonly content?: unknown } }[] }).choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI-compatible response did not include message content");
  }

  return content;
}

function anthropicText(json: unknown): string {
  const content = (json as { readonly content?: readonly { readonly type?: string; readonly text?: unknown }[] }).content;
  const text = content?.find((block) => block.type === "text")?.text;
  if (typeof text !== "string") {
    throw new Error("Anthropic response did not include a text block");
  }

  return text;
}

export function createOpenAICompatibleProvider(options: OpenAICompatProviderOptions): LocalProvider {
  const fetcher = options.fetch ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    id: options.id,
    costClass: options.costClass,
    capabilities: options.capabilities,
    async complete(request) {
      const response = await fetcher(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          messages: [{ role: "user", content: taskPrompt(request) }],
        }),
      });

      return openAIText(await parseJson(response));
    },
  };
}

export function createAnthropicHttpProvider(options: HttpProviderOptions): LocalProvider {
  const fetcher = options.fetch ?? fetch;

  return {
    id: options.id,
    costClass: options.costClass,
    capabilities: options.capabilities,
    async complete(request) {
      const response = await fetcher("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "x-api-key": options.apiKey,
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: 1024,
          messages: [{ role: "user", content: taskPrompt(request) }],
        }),
      });

      return anthropicText(await parseJson(response));
    },
  };
}
