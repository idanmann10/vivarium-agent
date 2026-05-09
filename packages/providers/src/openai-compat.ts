import { createOpenAICompatibleProvider, type OpenAICompatProviderOptions } from "./http.js";

export const openAiCompatProviderKind = "openai-compat";

export function createOpenAICompatProvider(options: OpenAICompatProviderOptions) {
  return createOpenAICompatibleProvider(options);
}
