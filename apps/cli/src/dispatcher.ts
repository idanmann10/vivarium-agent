import type {
  Capability,
  CostClass,
  CredentialKind,
  Visibility,
} from "../../../packages/core/src/index.js";
import type { HttpMethod } from "../../../packages/tools/src/external/index.js";
import { readFileSync } from "node:fs";
import {
  addCredentialCommand,
  credentialSmokeCommand,
  listCredentialsCommand,
  renderAddCredentialCommandResult,
  renderCredentialSmokeCommandResult,
  renderListCredentialsCommandResult,
} from "./commands/credentials.js";
import {
  curriculumAdvanceCommand,
  curriculumProgressCommand,
  curriculumReadCommand,
} from "./commands/curriculum.js";
import { daemonSmokeCommand, renderDaemonSmokeCommandResult } from "./commands/daemon.js";
import {
  doctorCommand,
  renderDoctorCommandResult,
  type DoctorCommandRunner,
} from "./commands/doctor.js";
import { dreamCommand } from "./commands/dream.js";
import {
  githubDiscussionCommand,
  githubPullRequestCommand,
  githubSmokeCommand,
  githubWorkflowRunsCommand,
  renderGitHubDiscussionCommandResult,
  renderGitHubPullRequestCommandResult,
  renderGitHubSmokeCommandResult,
  renderGitHubWorkflowRunsCommandResult,
} from "./commands/github.js";
import { helpCommand, renderHelpCommandResult } from "./commands/help.js";
import {
  identityHistoryCommand,
  identityStageCommand,
  identitySummaryCommand,
} from "./commands/identity.js";
import { renderInitCommandResult, runInitCommand } from "./commands/init.js";
import {
  liveEnvInitCommand,
  liveEvidenceInitCommand,
  liveSetupCommand,
  renderLiveEnvInitCommandResult,
  renderLiveEvidenceInitCommandResult,
  renderLiveSetupCommandResult,
} from "./commands/live.js";
import { modelCommand, renderModelCommandResult } from "./commands/model.js";
import { publishListCommand, publishRunCommand, publishTraceCommand } from "./commands/publish.js";
import {
  configureProviderProfileCommand,
  listProviderProfilesCommand,
  providerSmokeCommand,
  renderProviderProfilesCommandResult,
  renderProviderSmokeCommandResult,
  type ProviderSmokeKind,
} from "./commands/providers.js";
import { renderRunCommandResult, runCommand, type RunProviderKind } from "./commands/run.js";
import { renderSetupCommandResult, setupCommand } from "./commands/setup.js";
import { listSkillsCommand } from "./commands/skills.js";
import { renderStatusCommandResult, statusCommand } from "./commands/status.js";
import {
  renderUpdateCommandResult,
  updateCommand,
  type UpdateCommandRunner,
} from "./commands/update.js";
import {
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
import type { CliCommand } from "./index.js";

export interface CliDispatchResult {
  readonly command: CliCommand;
  readonly result: unknown;
  readonly output: string;
}

export interface CliDispatchOptions {
  readonly doctorRunner?: DoctorCommandRunner;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly updateRunner?: UpdateCommandRunner;
}

type FlagMap = ReadonlyMap<string, readonly string[]>;

function usage(message: string): never {
  throw new Error(message);
}

function parseFlags(argv: readonly string[]): {
  readonly positionals: readonly string[];
  readonly flags: FlagMap;
} {
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === undefined) {
      continue;
    }
    if (!item.startsWith("--")) {
      positionals.push(item);
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    const values = flags.get(key) ?? [];
    if (next === undefined || next.startsWith("--")) {
      flags.set(key, [...values, "true"]);
      continue;
    }

    flags.set(key, [...values, next]);
    index += 1;
  }

  return { positionals, flags };
}

function value(flags: FlagMap, name: string): string | undefined {
  return flags.get(name)?.at(-1);
}

function values(flags: FlagMap, name: string): readonly string[] {
  return flags.get(name) ?? [];
}

function required(flags: FlagMap, name: string): string {
  return value(flags, name) ?? usage(`Missing required --${name}`);
}

function integerFlag(flags: FlagMap, name: string): number | undefined {
  const raw = value(flags, name);
  if (raw === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    usage(`--${name} must be an integer`);
  }
  return parsed;
}

function booleanFlag(flags: FlagMap, name: string): boolean {
  return flags.has(name);
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function interpolateEnvValue(
  value: string,
  env: Readonly<Record<string, string | undefined>>,
): string {
  return value.replace(
    /\$(?:{([A-Za-z_][A-Za-z0-9_]*)}|([A-Za-z_][A-Za-z0-9_]*))/g,
    (_match, braced: string | undefined, bare: string | undefined) => {
      const name = braced ?? bare;
      return name === undefined ? "" : (env[name] ?? "");
    },
  );
}

function readEnvFile(
  path: string,
  baseEnv: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = { ...baseEnv };
  const body = readFileSync(path, "utf8");

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const assignment = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const separator = assignment.indexOf("=");
    if (separator < 1) {
      usage(`Invalid env file line in ${path}: ${line}`);
    }

    const name = assignment.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      usage(`Invalid env var name in ${path}: ${name}`);
    }

    const value = stripEnvQuotes(assignment.slice(separator + 1).trim());
    env[name] = interpolateEnvValue(value, env);
  }

  return env;
}

function output(command: CliCommand, result: unknown): CliDispatchResult {
  return { command, result, output: `${JSON.stringify(result, null, 2)}\n` };
}

export async function dispatchCliCommand(
  argv: readonly string[],
  options: CliDispatchOptions = {},
): Promise<CliDispatchResult> {
  const [command, subcommand, ...rest] = argv;
  if (command === undefined || command === "--help" || command === "-h") {
    const result = helpCommand();
    return { command: "help", result, output: renderHelpCommandResult(result) };
  }

  const commandArgs = (subcommand?.startsWith("--") ?? true) ? argv.slice(1) : rest;
  const { flags } = parseFlags(commandArgs);

  switch (command) {
    case "help": {
      const result = helpCommand();
      return { command, result, output: renderHelpCommandResult(result) };
    }
    case "init": {
      const worldRoot = value(flags, "world-root");
      const statePath = value(flags, "state-path");
      const result = runInitCommand({
        primaryDomain: value(flags, "domain") ?? value(flags, "primary-domain") ?? "coding",
        bindGithubIdentity: booleanFlag(flags, "bind-github"),
        providerProfiles: values(flags, "provider"),
        credentialNames: values(flags, "credential"),
        ...(worldRoot === undefined ? {} : { worldRoot }),
        ...(statePath === undefined ? {} : { statePath }),
      });
      return { command, result, output: renderInitCommandResult(result) };
    }
    case "setup": {
      const worldRoot = value(flags, "world-root");
      const statePath = value(flags, "state-path");
      const envFile = value(flags, "env-file");
      const result = setupCommand({
        primaryDomain: value(flags, "domain") ?? value(flags, "primary-domain") ?? "coding",
        ...(worldRoot === undefined ? {} : { worldRoot }),
        ...(statePath === undefined ? {} : { statePath }),
        ...(envFile === undefined
          ? {}
          : {
              envFilePath: envFile,
              env: readEnvFile(envFile, options.env ?? process.env),
            }),
        ...(booleanFlag(flags, "confirm-write") ? { confirmWrite: true } : {}),
      });
      return { command, result, output: renderSetupCommandResult(result) };
    }
    case "model": {
      const profilesPath = value(flags, "profiles-path");
      const envFile = value(flags, "env-file");
      const env =
        envFile === undefined
          ? (options.env ?? process.env)
          : readEnvFile(envFile, options.env ?? process.env);
      const result = modelCommand({
        ...(profilesPath === undefined ? {} : { profilesPath }),
        env,
      });
      return { command, result, output: renderModelCommandResult(result) };
    }
    case "run": {
      const domain = value(flags, "domain");
      const worldRoot = value(flags, "world-root");
      const worldSubscriptionsPath = value(flags, "world-subscriptions-path");
      const statePath = value(flags, "state-path");
      const providerKind = value(flags, "provider-kind") as RunProviderKind | undefined;
      const providerApiKeyEnv = value(flags, "provider-api-key-env");
      const providerModel = value(flags, "provider-model");
      const providerBaseUrl = value(flags, "provider-base-url");
      const providerProfilesPath = value(flags, "provider-profiles-path");
      const providerProfile = value(flags, "provider-profile");
      const availableToolsets = values(flags, "available-toolset");
      const availableTools = values(flags, "available-tool");
      const result = await runCommand({
        goal: required(flags, "goal"),
        ...(domain === undefined ? {} : { domain }),
        ...(worldRoot === undefined ? {} : { worldRoot }),
        ...(worldSubscriptionsPath === undefined ? {} : { worldSubscriptionsPath }),
        ...(statePath === undefined ? {} : { statePath }),
        ...(booleanFlag(flags, "force-failure") ? { forceFailure: true } : {}),
        ...(providerKind === undefined ? {} : { providerKind }),
        ...(providerApiKeyEnv === undefined ? {} : { providerApiKeyEnv }),
        ...(providerModel === undefined ? {} : { providerModel }),
        ...(providerBaseUrl === undefined ? {} : { providerBaseUrl }),
        ...(providerProfilesPath === undefined ? {} : { providerProfilesPath }),
        ...(providerProfile === undefined ? {} : { providerProfile }),
        ...(availableToolsets.length === 0 ? {} : { availableToolsets }),
        ...(availableTools.length === 0 ? {} : { availableTools }),
      });
      return { command, result, output: renderRunCommandResult(result) };
    }
    case "credentials": {
      if (subcommand === "add") {
        const result = addCredentialCommand({
          credentialsPath: required(flags, "path"),
          masterKey: required(flags, "master-key"),
          kind: required(flags, "kind") as CredentialKind,
          name: required(flags, "name"),
          purpose: required(flags, "purpose"),
          value: required(flags, "value"),
          scopes: values(flags, "scope"),
        });
        return { command, result, output: renderAddCredentialCommandResult(result) };
      }

      if (subcommand === "list") {
        const result = listCredentialsCommand({
          credentialsPath: required(flags, "path"),
          masterKey: required(flags, "master-key"),
        });
        return { command, result, output: renderListCredentialsCommandResult(result) };
      }

      if (subcommand === "smoke") {
        const method = value(flags, "method") as HttpMethod | undefined;
        const body = value(flags, "body");
        const result = await credentialSmokeCommand({
          credentialsPath: required(flags, "path"),
          masterKey: required(flags, "master-key"),
          name: required(flags, "name"),
          url: required(flags, "url"),
          ...(method === undefined ? {} : { method }),
          ...(body === undefined ? {} : { body }),
        });
        return { command, result, output: renderCredentialSmokeCommandResult(result) };
      }

      usage('Unknown credentials subcommand. Use "add", "list", or "smoke".');
    }
    case "skills":
      if (subcommand !== "list") {
        usage('Unknown skills subcommand. Use "list".');
      }
      {
        const domain = value(flags, "domain");
        return output(
          command,
          listSkillsCommand({
            statePath: required(flags, "state-path"),
            ...(domain === undefined ? {} : { domain }),
          }),
        );
      }
    case "world":
      if (subcommand === "subscribe") {
        const priority = integerFlag(flags, "priority");
        const ref = value(flags, "world-ref");
        const result = subscribeWorldCommand({
          subscriptionsPath: required(flags, "subscriptions-path"),
          root: required(flags, "world-root"),
          label: required(flags, "world-label"),
          ...(priority === undefined ? {} : { priority }),
          ...(ref === undefined ? {} : { ref }),
          ...(booleanFlag(flags, "auto-push") ? { autoPushEnabled: true } : {}),
        });
        return { command, result, output: renderWorldSubscriptionsCommandResult(result) };
      }

      if (subcommand === "subscriptions") {
        const result = listWorldSubscriptionsCommand({
          subscriptionsPath: required(flags, "subscriptions-path"),
        });
        return { command, result, output: renderWorldSubscriptionsCommandResult(result) };
      }

      if (subcommand === "pull") {
        const ref = value(flags, "ref");
        const result = await pullWorldCommand({
          remote: required(flags, "remote"),
          destination: required(flags, "destination"),
          ...(ref === undefined ? {} : { ref }),
        });
        return { command, result, output: renderPullWorldCommandResult(result) };
      }

      if (subcommand === "search") {
        const limit = integerFlag(flags, "limit");
        const worldRoots = values(flags, "world-root");
        const worldLabels = values(flags, "world-label");
        const subscriptionsPath = value(flags, "subscriptions-path");
        const availableToolsets = values(flags, "available-toolset");
        const availableTools = values(flags, "available-tool");
        if (worldLabels.length > 0 && worldLabels.length !== worldRoots.length) {
          usage("--world-label must be provided once for each --world-root");
        }
        const result = searchWorldCommand({
          ...(worldRoots.length > 1
            ? {
                worlds: worldRoots.map((root, index) => ({
                  root,
                  label: worldLabels[index] ?? `world-${index + 1}`,
                  priority: index,
                })),
              }
            : worldRoots.length === 1
              ? { worldRoot: worldRoots[0] as string }
              : subscriptionsPath === undefined
                ? { worldRoot: required(flags, "world-root") }
                : { subscriptionsPath }),
          domain: required(flags, "domain"),
          query: required(flags, "query"),
          ...(limit === undefined ? {} : { limit }),
          ...(availableToolsets.length === 0 ? {} : { availableToolsets }),
          ...(availableTools.length === 0 ? {} : { availableTools }),
        });
        return { command, result, output: renderSearchWorldCommandResult(result) };
      }

      if (subcommand === "transmission-smoke") {
        const ref = value(flags, "ref");
        const limit = integerFlag(flags, "limit");
        const result = await verifyWorldTransmissionCommand({
          remote: required(flags, "remote"),
          destination: required(flags, "destination"),
          domain: required(flags, "domain"),
          query: required(flags, "query"),
          ...(ref === undefined ? {} : { ref }),
          ...(limit === undefined ? {} : { limit }),
        });
        return { command, result, output: renderVerifyWorldTransmissionCommandResult(result) };
      }

      usage(
        'Unknown world subcommand. Use "search", "subscribe", "subscriptions", "pull", or "transmission-smoke".',
      );
    case "dream": {
      if (subcommand !== "run") {
        usage('Unknown dream subcommand. Use "run".');
      }
      const domain = value(flags, "domain");
      return output(
        command,
        dreamCommand({
          statePath: required(flags, "state-path"),
          ...(domain === undefined ? {} : { domain }),
        }),
      );
    }
    case "identity": {
      if (subcommand === "summary") {
        return output(
          command,
          identitySummaryCommand({ statePath: required(flags, "state-path") }),
        );
      }

      if (subcommand === "stage") {
        return output(
          command,
          identityStageCommand({
            statePath: required(flags, "state-path"),
            domain: required(flags, "domain"),
          }),
        );
      }

      if (subcommand === "history") {
        const limit = integerFlag(flags, "limit");
        return output(
          command,
          identityHistoryCommand({
            statePath: required(flags, "state-path"),
            ...(limit === undefined ? {} : { limit }),
          }),
        );
      }

      usage('Unknown identity subcommand. Use "summary", "stage", or "history".');
    }
    case "curriculum": {
      if (subcommand === "read") {
        return output(
          command,
          curriculumReadCommand({
            worldRoot: required(flags, "world-root"),
            domain: required(flags, "domain"),
          }),
        );
      }

      if (subcommand === "progress") {
        return output(
          command,
          curriculumProgressCommand({
            statePath: required(flags, "state-path"),
            domain: required(flags, "domain"),
          }),
        );
      }

      if (subcommand === "advance") {
        const stepIndex = integerFlag(flags, "step");
        if (stepIndex === undefined) {
          usage("Missing required --step");
        }
        return output(
          command,
          curriculumAdvanceCommand({
            statePath: required(flags, "state-path"),
            domain: required(flags, "domain"),
            stepIndex,
          }),
        );
      }

      usage('Unknown curriculum subcommand. Use "read", "progress", or "advance".');
    }
    case "publish": {
      if (subcommand === "list") {
        return output(command, publishListCommand({ statePath: required(flags, "state-path") }));
      }

      if (subcommand === "run") {
        return output(
          command,
          publishRunCommand({
            statePath: required(flags, "state-path"),
            worldRoot: required(flags, "world-root"),
            worldSubscriptionsPath: required(flags, "world-subscriptions-path"),
            runId: required(flags, "run-id"),
            visibility: required(flags, "visibility") as Visibility,
            contributor: required(flags, "contributor"),
          }),
        );
      }

      if (subcommand === "trace") {
        return output(
          command,
          publishTraceCommand({
            statePath: required(flags, "state-path"),
            worldRoot: required(flags, "world-root"),
            worldSubscriptionsPath: required(flags, "world-subscriptions-path"),
            traceId: required(flags, "trace-id"),
            visibility: required(flags, "visibility") as Visibility,
            contributor: required(flags, "contributor"),
          }),
        );
      }

      usage('Unknown publish subcommand. Use "list", "run", or "trace".');
    }
    case "providers": {
      if (subcommand === "configure") {
        const baseUrl = value(flags, "base-url");
        const contextWindow = integerFlag(flags, "context-window");
        if (contextWindow === undefined) {
          usage("Missing required --context-window");
        }
        const result = configureProviderProfileCommand({
          profilesPath: required(flags, "profiles-path"),
          name: required(flags, "name"),
          kind: required(flags, "kind") as ProviderSmokeKind,
          apiKeyEnv: required(flags, "api-key-env"),
          model: required(flags, "model"),
          ...(baseUrl === undefined ? {} : { baseUrl }),
          capabilities: values(flags, "capability") as readonly Capability[],
          contextWindow,
          costClass: required(flags, "cost-class") as CostClass,
        });
        return { command, result, output: renderProviderProfilesCommandResult(result) };
      }

      if (subcommand === "list") {
        const result = listProviderProfilesCommand({
          profilesPath: required(flags, "profiles-path"),
        });
        return { command, result, output: renderProviderProfilesCommandResult(result) };
      }

      if (subcommand !== "smoke") {
        usage('Unknown providers subcommand. Use "configure", "list", or "smoke".');
      }
      const baseUrl = value(flags, "base-url");
      const prompt = value(flags, "prompt");
      const kind = value(flags, "kind") as ProviderSmokeKind | undefined;
      const apiKeyEnv = value(flags, "api-key-env");
      const model = value(flags, "model");
      const profilesPath = value(flags, "profiles-path");
      const profile = value(flags, "profile");
      const result = await providerSmokeCommand({
        ...(kind === undefined ? {} : { kind }),
        ...(apiKeyEnv === undefined ? {} : { apiKeyEnv }),
        ...(model === undefined ? {} : { model }),
        ...(baseUrl === undefined ? {} : { baseUrl }),
        ...(profilesPath === undefined ? {} : { profilesPath }),
        ...(profile === undefined ? {} : { profile }),
        ...(prompt === undefined ? {} : { prompt }),
      });
      return { command, result, output: renderProviderSmokeCommandResult(result) };
    }
    case "github": {
      if (subcommand === "smoke") {
        const result = await githubSmokeCommand({
          owner: required(flags, "owner"),
          repo: required(flags, "repo"),
          tokenEnv: required(flags, "token-env"),
        });
        return { command, result, output: renderGitHubSmokeCommandResult(result) };
      }

      if (subcommand === "discussion") {
        const result = await githubDiscussionCommand({
          owner: required(flags, "owner"),
          repo: required(flags, "repo"),
          tokenEnv: required(flags, "token-env"),
          repositoryId: required(flags, "repository-id"),
          categoryId: required(flags, "category-id"),
          title: required(flags, "title"),
          body: required(flags, "body"),
          confirmWrite: booleanFlag(flags, "confirm-write"),
        });
        return { command, result, output: renderGitHubDiscussionCommandResult(result) };
      }

      if (subcommand === "pull-request") {
        const result = await githubPullRequestCommand({
          owner: required(flags, "owner"),
          repo: required(flags, "repo"),
          tokenEnv: required(flags, "token-env"),
          title: required(flags, "title"),
          body: required(flags, "body"),
          head: required(flags, "head"),
          base: required(flags, "base"),
          confirmWrite: booleanFlag(flags, "confirm-write"),
        });
        return { command, result, output: renderGitHubPullRequestCommandResult(result) };
      }

      if (subcommand === "workflow-runs") {
        const branch = value(flags, "branch");
        const limit = integerFlag(flags, "limit");
        const result = await githubWorkflowRunsCommand({
          owner: required(flags, "owner"),
          repo: required(flags, "repo"),
          tokenEnv: required(flags, "token-env"),
          ...(branch === undefined ? {} : { branch }),
          ...(limit === undefined ? {} : { limit }),
        });
        return { command, result, output: renderGitHubWorkflowRunsCommandResult(result) };
      }

      usage(
        'Unknown github subcommand. Use "smoke", "discussion", "pull-request", or "workflow-runs".',
      );
    }
    case "daemon": {
      if (subcommand !== "smoke") {
        usage('Unknown daemon subcommand. Use "smoke".');
      }
      const statusUrl = value(flags, "status-url");
      const result = await daemonSmokeCommand(statusUrl === undefined ? {} : { statusUrl });
      return { command, result, output: renderDaemonSmokeCommandResult(result) };
    }
    case "live": {
      if (subcommand === "env-init") {
        const result = liveEnvInitCommand({
          path: required(flags, "path"),
          overwrite: booleanFlag(flags, "overwrite"),
        });
        return { command, result, output: renderLiveEnvInitCommandResult(result) };
      }

      if (subcommand === "evidence-init") {
        const result = liveEvidenceInitCommand({
          path: required(flags, "path"),
          overwrite: booleanFlag(flags, "overwrite"),
        });
        return { command, result, output: renderLiveEvidenceInitCommandResult(result) };
      }

      if (subcommand === "setup") {
        const envFile = required(flags, "env-file");
        const result = liveSetupCommand({
          env: readEnvFile(envFile, options.env ?? process.env),
          confirmWrite: booleanFlag(flags, "confirm-write"),
        });
        return { command, result, output: renderLiveSetupCommandResult(result) };
      }

      usage('Unknown live subcommand. Use "env-init", "setup", or "evidence-init".');
    }
    case "status": {
      const result = statusCommand();
      return { command, result, output: renderStatusCommandResult(result) };
    }
    case "update": {
      const result = updateCommand({
        agentRoot: value(flags, "agent-root") ?? process.cwd(),
        ...(options.updateRunner === undefined ? {} : { runner: options.updateRunner }),
      });
      return { command, result, output: renderUpdateCommandResult(result) };
    }
    case "doctor": {
      const agentRoot = value(flags, "agent-root");
      const worldRoot = value(flags, "world-root");
      const envFile = value(flags, "env-file");
      const env =
        envFile === undefined ? options.env : readEnvFile(envFile, options.env ?? process.env);
      const result = doctorCommand({
        ...(booleanFlag(flags, "live") ? { mode: "live-readiness" } : {}),
        ...(agentRoot === undefined ? {} : { agentRoot }),
        ...(worldRoot === undefined ? {} : { worldRoot }),
        ...(options.doctorRunner === undefined ? {} : { runner: options.doctorRunner }),
        ...(env === undefined ? {} : { env }),
        ...(envFile === undefined ? {} : { envFilePath: envFile }),
      });
      return { command, result, output: renderDoctorCommandResult(result) };
    }
    default:
      usage(`Unknown command "${command}"`);
  }
}
