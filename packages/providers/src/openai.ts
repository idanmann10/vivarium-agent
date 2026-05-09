import { createOpenAICompatibleProvider, type HttpProviderOptions } from "./http.js";

export const openaiProviderKind = "openai";

export function createOpenAIProvider(options: HttpProviderOptions) {
  return createOpenAICompatibleProvider({ ...options, baseUrl: "https://api.openai.com" });
}
