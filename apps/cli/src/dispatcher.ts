import type { CredentialKind } from "../../../packages/core/src/index.js";
import { addCredentialCommand, listCredentialsCommand } from "./commands/credentials.js";
import { daemonSmokeCommand } from "./commands/daemon.js";
import { doctorCommand } from "./commands/doctor.js";
import { githubSmokeCommand } from "./commands/github.js";
import { runInitCommand } from "./commands/init.js";
import { providerSmokeCommand, type ProviderSmokeKind } from "./commands/providers.js";
import { runCommand } from "./commands/run.js";
import { listSkillsCommand } from "./commands/skills.js";
import { statusCommand } from "./commands/status.js";
import { pullWorldCommand, searchWorldCommand } from "./commands/world.js";
import type { CliCommand } from "./index.js";

export interface CliDispatchResult {
  readonly command: CliCommand;
  readonly result: unknown;
  readonly output: string;
}

type FlagMap = ReadonlyMap<string, readonly string[]>;

function usage(message: string): never {
  throw new Error(message);
}

function parseFlags(argv: readonly string[]): { readonly positionals: readonly string[]; readonly flags: FlagMap } {
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

function output(command: CliCommand, result: unknown): CliDispatchResult {
  return { command, result, output: `${JSON.stringify(result, null, 2)}\n` };
}

export async function dispatchCliCommand(argv: readonly string[]): Promise<CliDispatchResult> {
  const [command, subcommand, ...rest] = argv;
  if (command === undefined) {
    usage("Missing command");
  }

  const commandArgs = subcommand?.startsWith("--") ?? true ? argv.slice(1) : rest;
  const { flags } = parseFlags(commandArgs);

  switch (command) {
    case "init": {
      const worldRoot = value(flags, "world-root");
      const statePath = value(flags, "state-path");
      return output(
        command,
        runInitCommand({
          primaryDomain: value(flags, "domain") ?? value(flags, "primary-domain") ?? "coding",
          bindGithubIdentity: booleanFlag(flags, "bind-github"),
          providerProfiles: values(flags, "provider"),
          credentialNames: values(flags, "credential"),
          ...(worldRoot === undefined ? {} : { worldRoot }),
          ...(statePath === undefined ? {} : { statePath }),
        }),
      );
    }
    case "run": {
      const domain = value(flags, "domain");
      const worldRoot = value(flags, "world-root");
      const statePath = value(flags, "state-path");
      return output(
        command,
        await runCommand({
          goal: required(flags, "goal"),
          ...(domain === undefined ? {} : { domain }),
          ...(worldRoot === undefined ? {} : { worldRoot }),
          ...(statePath === undefined ? {} : { statePath }),
          ...(booleanFlag(flags, "force-failure") ? { forceFailure: true } : {}),
        }),
      );
    }
    case "credentials": {
      if (subcommand === "add") {
        return output(
          command,
          addCredentialCommand({
            credentialsPath: required(flags, "path"),
            masterKey: required(flags, "master-key"),
            kind: required(flags, "kind") as CredentialKind,
            name: required(flags, "name"),
            purpose: required(flags, "purpose"),
            value: required(flags, "value"),
            scopes: values(flags, "scope"),
          }),
        );
      }

      if (subcommand === "list") {
        return output(
          command,
          listCredentialsCommand({
            credentialsPath: required(flags, "path"),
            masterKey: required(flags, "master-key"),
          }),
        );
      }

      usage('Unknown credentials subcommand. Use "add" or "list".');
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
      if (subcommand === "pull") {
        const ref = value(flags, "ref");
        return output(
          command,
          await pullWorldCommand({
            remote: required(flags, "remote"),
            destination: required(flags, "destination"),
            ...(ref === undefined ? {} : { ref }),
          }),
        );
      }

      if (subcommand === "search") {
        const limit = integerFlag(flags, "limit");
        return output(
          command,
          searchWorldCommand({
            worldRoot: required(flags, "world-root"),
            domain: required(flags, "domain"),
            query: required(flags, "query"),
            ...(limit === undefined ? {} : { limit }),
          }),
        );
      }

      usage('Unknown world subcommand. Use "search" or "pull".');
    case "providers": {
      if (subcommand !== "smoke") {
        usage('Unknown providers subcommand. Use "smoke".');
      }
      const baseUrl = value(flags, "base-url");
      const prompt = value(flags, "prompt");
      return output(
        command,
        await providerSmokeCommand({
          kind: required(flags, "kind") as ProviderSmokeKind,
          apiKeyEnv: required(flags, "api-key-env"),
          model: required(flags, "model"),
          ...(baseUrl === undefined ? {} : { baseUrl }),
          ...(prompt === undefined ? {} : { prompt }),
        }),
      );
    }
    case "github": {
      if (subcommand !== "smoke") {
        usage('Unknown github subcommand. Use "smoke".');
      }
      return output(
        command,
        await githubSmokeCommand({
          owner: required(flags, "owner"),
          repo: required(flags, "repo"),
          tokenEnv: required(flags, "token-env"),
        }),
      );
    }
    case "daemon": {
      if (subcommand !== "smoke") {
        usage('Unknown daemon subcommand. Use "smoke".');
      }
      const statusUrl = value(flags, "status-url");
      return output(command, await daemonSmokeCommand(statusUrl === undefined ? {} : { statusUrl }));
    }
    case "status":
      return output(command, statusCommand());
    case "doctor": {
      const agentRoot = value(flags, "agent-root");
      const worldRoot = value(flags, "world-root");
      return output(
        command,
        doctorCommand({
          ...(booleanFlag(flags, "live") ? { mode: "live-readiness" } : {}),
          ...(agentRoot === undefined ? {} : { agentRoot }),
          ...(worldRoot === undefined ? {} : { worldRoot }),
        }),
      );
    }
    default:
      usage(`Unknown command "${command}"`);
  }
}
