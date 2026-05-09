export const cliCommands = [
  "init",
  "run",
  "dream",
  "skills",
  "world",
  "credentials",
  "identity",
  "publish",
  "curriculum",
  "status",
  "doctor",
] as const;

export type CliCommand = (typeof cliCommands)[number];
