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
export { addCredentialCommand, listCredentialsCommand } from "./commands/credentials.js";
export type {
  AddCredentialCommandOptions,
  AddCredentialCommandResult,
  CredentialStoreCommandOptions,
  ListedCredential,
  ListCredentialsCommandResult,
} from "./commands/credentials.js";
export { listSkillsCommand } from "./commands/skills.js";
export type { ListedSkill, ListSkillsCommandOptions, ListSkillsCommandResult } from "./commands/skills.js";
export { searchWorldCommand } from "./commands/world.js";
export type { SearchWorldCommandOptions, SearchWorldCommandResult } from "./commands/world.js";
