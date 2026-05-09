export interface InitCommandOptions {
  readonly primaryDomain: string;
  readonly bindGithubIdentity: boolean;
}

export function describeInitCommand(options: InitCommandOptions): string {
  return `Initialize local state for ${options.primaryDomain}`;
}
