export const cliCommands = [
  "setup",
  "init",
  "run",
  "dream",
  "skills",
  "world",
  "providers",
  "github",
  "daemon",
  "live",
  "credentials",
  "identity",
  "publish",
  "curriculum",
  "help",
  "model",
  "status",
  "update",
  "doctor",
] as const;

export type CliCommand = (typeof cliCommands)[number];

export { describeInitCommand, renderInitCommandResult, runInitCommand } from "./commands/init.js";
export type { InitCommandOptions, InitCommandResult, StarterArtifact } from "./commands/init.js";
export { renderSetupCommandResult, setupCommand } from "./commands/setup.js";
export type { SetupCommandOptions, SetupCommandResult } from "./commands/setup.js";
export { renderRunCommandResult, runCommand } from "./commands/run.js";
export type { RunCommandOptions, RunCommandResult, RunProviderKind } from "./commands/run.js";
export { dreamCommand, renderDreamCommandResult } from "./commands/dream.js";
export type { DreamCommandOptions } from "./commands/dream.js";
export { helpCommand, renderHelpCommandResult } from "./commands/help.js";
export type { HelpCommandItem, HelpCommandResult } from "./commands/help.js";
export { modelCommand, renderModelCommandResult } from "./commands/model.js";
export type {
  ModelCommandOptions,
  ModelCommandProblem,
  ModelCommandResult,
  ModelProfileSummary,
} from "./commands/model.js";
export { renderStatusCommandResult, statusCommand } from "./commands/status.js";
export { renderUpdateCommandResult, updateCommand } from "./commands/update.js";
export type {
  UpdateCommandOptions,
  UpdateCommandResult,
  UpdateCommandRunner,
} from "./commands/update.js";
export { doctorCommand, renderDoctorCommandResult } from "./commands/doctor.js";
export {
  addCredentialCommand,
  credentialSmokeCommand,
  listCredentialsCommand,
  renderAddCredentialCommandResult,
  renderCredentialSmokeCommandResult,
  renderListCredentialsCommandResult,
} from "./commands/credentials.js";
export type {
  AddCredentialCommandOptions,
  AddCredentialCommandResult,
  CredentialSmokeCommandOptions,
  CredentialSmokeCommandResult,
  CredentialStoreCommandOptions,
  ListedCredential,
  ListCredentialsCommandResult,
} from "./commands/credentials.js";
export {
  configureProviderProfileCommand,
  listProviderProfilesCommand,
  providerSmokeCommand,
  renderProviderProfilesCommandResult,
  renderProviderSmokeCommandResult,
} from "./commands/providers.js";
export type {
  ConfigureProviderProfileCommandOptions,
  ProviderProfile,
  ProviderProfilesCommandOptions,
  ProviderProfilesCommandResult,
  ProviderSmokeCommandOptions,
  ProviderSmokeCommandResult,
  ProviderSmokeKind,
} from "./commands/providers.js";
export {
  curriculumAdvanceCommand,
  curriculumProgressCommand,
  curriculumReadCommand,
  renderCurriculumProgressCommandResult,
  renderCurriculumReadCommandResult,
} from "./commands/curriculum.js";
export type {
  CurriculumAdvanceCommandOptions,
  CurriculumProgressCommandResult,
  CurriculumReadCommandOptions,
  CurriculumReadCommandResult,
  CurriculumStateCommandOptions,
} from "./commands/curriculum.js";
export {
  identityHistoryCommand,
  identityStageCommand,
  identitySummaryCommand,
  renderIdentityHistoryCommandResult,
  renderIdentityStageCommandResult,
  renderIdentitySummaryCommandResult,
} from "./commands/identity.js";
export type {
  IdentityCommandOptions,
  IdentityHistoryCommandOptions,
  IdentityHistoryCommandResult,
  IdentityHistoryItem,
  IdentityStageCommandOptions,
  IdentityStageCommandResult,
  IdentitySummaryCommandResult,
} from "./commands/identity.js";
export {
  publishListCommand,
  publishRunCommand,
  publishTraceCommand,
  renderPublishListCommandResult,
  renderPublishRunCommandResult,
  renderPublishTraceCommandResult,
} from "./commands/publish.js";
export type {
  PublishArtifactCommandResult,
  PublishListCommandOptions,
  PublishListCommandResult,
  PublishRunCommandOptions,
  PublishTraceCommandOptions,
} from "./commands/publish.js";
export {
  githubDiscussionCommand,
  githubPullRequestCommand,
  githubSmokeCommand,
  githubWorkflowRunsCommand,
  renderGitHubDiscussionCommandResult,
  renderGitHubPullRequestCommandResult,
  renderGitHubSmokeCommandResult,
  renderGitHubWorkflowRunsCommandResult,
} from "./commands/github.js";
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
export { daemonSmokeCommand, renderDaemonSmokeCommandResult } from "./commands/daemon.js";
export type {
  DaemonSmokeCommandOptions,
  DaemonSmokeCommandResult,
  DaemonSmokeFetch,
} from "./commands/daemon.js";
export {
  liveEnvInitCommand,
  liveEvidenceInitCommand,
  liveSetupCommand,
  renderLiveEnvInitCommandResult,
  renderLiveEvidenceInitCommandResult,
  renderLiveSetupCommandResult,
} from "./commands/live.js";
export type {
  LiveEnvInitCommandOptions,
  LiveEnvInitCommandResult,
  LiveEvidenceInitCommandOptions,
  LiveEvidenceInitCommandResult,
  LiveSetupCommandOptions,
  LiveSetupCommandResult,
} from "./commands/live.js";
export { listSkillsCommand, renderListSkillsCommandResult } from "./commands/skills.js";
export type {
  ListedSkill,
  ListSkillsCommandOptions,
  ListSkillsCommandResult,
} from "./commands/skills.js";
export {
  listWorldSubscriptionsCommand,
  pullWorldCommand,
  renderPullWorldCommandResult,
  renderSearchWorldCommandResult,
  renderVerifyWorldTransmissionCommandResult,
  renderWorldSubscriptionsCommandResult,
  searchWorldCommand,
  subscribeWorldCommand,
  verifyWorldTransmissionCommand,
} from "./commands/world.js";
export type {
  PersistedWorldSubscription,
  PullWorldCommandOptions,
  SearchWorldCommandOptions,
  SearchWorldCommandResult,
  SubscribeWorldCommandOptions,
  VerifyWorldTransmissionCommandOptions,
  VerifyWorldTransmissionCommandResult,
  WorldSubscriptionsCommandOptions,
  WorldSubscriptionsCommandResult,
} from "./commands/world.js";
export type { CliDispatchResult } from "./dispatcher.js";
