import { createAnthropicHttpProvider, type HttpProviderOptions } from "./http.js";

export const anthropicProviderKind = "anthropic";

export function createAnthropicProvider(options: HttpProviderOptions) {
  return createAnthropicHttpProvider(options);
}
