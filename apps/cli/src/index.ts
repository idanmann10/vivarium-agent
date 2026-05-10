import { dispatchCliCommand } from "./dispatcher.js";

export const cliCommands = [
  "init",
  "run",
  "dream",
  "skills",
  "world",
  "providers",
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
export { providerSmokeCommand } from "./commands/providers.js";
export type { ProviderSmokeCommandOptions, ProviderSmokeCommandResult, ProviderSmokeKind } from "./commands/providers.js";
export { listSkillsCommand } from "./commands/skills.js";
export type { ListedSkill, ListSkillsCommandOptions, ListSkillsCommandResult } from "./commands/skills.js";
export { searchWorldCommand } from "./commands/world.js";
export type { SearchWorldCommandOptions, SearchWorldCommandResult } from "./commands/world.js";
export type { CliDispatchResult } from "./dispatcher.js";

if (import.meta.main) {
  try {
    const result = await dispatchCliCommand(Bun.argv.slice(2));
    process.stdout.write(result.output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
