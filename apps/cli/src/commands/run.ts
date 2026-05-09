export interface RunCommandOptions {
  readonly goal: string;
  readonly domain?: string;
}

export function describeRunCommand(options: RunCommandOptions): string {
  return options.domain === undefined ? options.goal : `${options.domain}: ${options.goal}`;
}
