export interface ModelProfile {
  readonly model: string;
  readonly capabilities: readonly string[];
  readonly contextWindow: number;
}
