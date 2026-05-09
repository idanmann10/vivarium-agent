import type { Capability, CostClass } from "../../core/src/index.js";

export type LocalProviderTaskKind = "plan" | "predict" | "execute" | "validate" | "reflect" | "recover";

export interface ProviderCompletionRequest {
  readonly kind: LocalProviderTaskKind;
  readonly input: string;
}

export interface LocalProvider {
  readonly id: string;
  readonly costClass: CostClass;
  readonly capabilities: readonly Capability[];
  complete(request: ProviderCompletionRequest): Promise<string>;
}

export interface LocalProviderOptions {
  readonly id: string;
  readonly costClass: CostClass;
  readonly capabilities: readonly Capability[];
}

export function createLocalProvider(options: LocalProviderOptions): LocalProvider {
  return {
    ...options,
    async complete(request) {
      switch (request.kind) {
        case "plan":
          return `Plan: decompose "${request.input}", retrieve world context, and validate output.`;
        case "predict":
          return `Prediction: "${request.input}" should complete with local evidence. Confidence: 0.7.`;
        case "execute":
          return `Observation: executed "${request.input}" with local deterministic provider.`;
        case "validate":
          return `Validation: "${request.input}" is internally consistent. Score: 0.8.`;
        case "reflect":
          return `Reflection: kept the run bounded, evidence-led, and publishable only by opt-in.`;
        case "recover":
          return `Recovery: replan after forced failure and narrow scope.`;
      }
    },
  };
}
