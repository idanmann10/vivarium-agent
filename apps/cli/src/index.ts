import { dispatchCliCommand } from "./dispatcher.js";

export const cliCommands = [
  "init",
  "run",
  "dream",
  "skills",
  "world",
  "providers",
  "github",
  "daemon",
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
export type { RunCommandOptions, RunCommandResult, RunProviderKind } from "./commands/run.js";
export { statusCommand } from "./commands/status.js";
export { doctorCommand } from "./commands/doctor.js";
export { addCredentialCommand, credentialSmokeCommand, listCredentialsCommand } from "./commands/credentials.js";
export type {
  AddCredentialCommandOptions,
  AddCredentialCommandResult,
  CredentialSmokeCommandOptions,
  CredentialSmokeCommandResult,
  CredentialStoreCommandOptions,
  ListedCredential,
  ListCredentialsCommandResult,
} from "./commands/credentials.js";
export { configureProviderProfileCommand, listProviderProfilesCommand, providerSmokeCommand } from "./commands/providers.js";
export type {
  ConfigureProviderProfileCommandOptions,
  ProviderProfile,
  ProviderProfilesCommandOptions,
  ProviderProfilesCommandResult,
  ProviderSmokeCommandOptions,
  ProviderSmokeCommandResult,
  ProviderSmokeKind,
} from "./commands/providers.js";
export { githubDiscussionCommand, githubPullRequestCommand, githubSmokeCommand, githubWorkflowRunsCommand } from "./commands/github.js";
export type {
  GitHubDiscussionCommandOptions,
  GitHubDiscussionCommandResult,
  GitHubPullRequestCommandOptions,
  GitHubPullRequestCommandResult,
  GitHubRepositoryPermissions,
  GitHubSmokeCommandOptions,
  GitHubSmokeCommandResult,
  GitHubWorkflowRunSummary,
  GitHubWorkflowRunsCommandOptions,
  GitHubWorkflowRunsCommandResult,
} from "./commands/github.js";
export { daemonSmokeCommand } from "./commands/daemon.js";
export type { DaemonSmokeCommandOptions, DaemonSmokeCommandResult, DaemonSmokeFetch } from "./commands/daemon.js";
export { listSkillsCommand } from "./commands/skills.js";
export type { ListedSkill, ListSkillsCommandOptions, ListSkillsCommandResult } from "./commands/skills.js";
export { listWorldSubscriptionsCommand, searchWorldCommand, subscribeWorldCommand } from "./commands/world.js";
export type {
  PersistedWorldSubscription,
  SearchWorldCommandOptions,
  SearchWorldCommandResult,
  SubscribeWorldCommandOptions,
  WorldSubscriptionsCommandOptions,
  WorldSubscriptionsCommandResult,
} from "./commands/world.js";
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
