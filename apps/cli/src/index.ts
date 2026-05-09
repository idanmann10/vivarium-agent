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

export { describeInitCommand, runInitCommand } from "./commands/init.js";
export type { InitCommandOptions, InitCommandResult, StarterArtifact } from "./commands/init.js";
export { runCommand } from "./commands/run.js";
export { statusCommand } from "./commands/status.js";
export { doctorCommand } from "./commands/doctor.js";
