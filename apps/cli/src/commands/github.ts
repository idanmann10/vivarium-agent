import type { GitHubFetch } from "../../../../packages/world/src/index.js";

export interface GitHubSmokeCommandOptions {
  readonly owner: string;
  readonly repo: string;
  readonly tokenEnv: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: GitHubFetch;
}

export interface GitHubRepositoryPermissions {
  readonly pull: boolean;
  readonly push: boolean;
  readonly admin: boolean;
}

export type GitHubSmokeCommandResult =
  | {
      readonly ok: true;
      readonly owner: string;
      readonly repo: string;
      readonly fullName: string;
      readonly visibility: "private" | "public";
      readonly defaultBranch: string;
      readonly discussionsEnabled: boolean;
      readonly permissions?: GitHubRepositoryPermissions;
    }
  | {
      readonly ok: false;
      readonly owner: string;
      readonly repo: string;
      readonly error: string;
    };

function headers(token: string): Record<string, string> {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
  };
}

function parsePermissions(value: unknown): GitHubRepositoryPermissions | undefined {
  const permissions = value as { readonly pull?: unknown; readonly push?: unknown; readonly admin?: unknown };
  if (
    typeof permissions.pull !== "boolean" ||
    typeof permissions.push !== "boolean" ||
    typeof permissions.admin !== "boolean"
  ) {
    return undefined;
  }

  return { pull: permissions.pull, push: permissions.push, admin: permissions.admin };
}

function parseRepository(owner: string, repo: string, json: unknown): GitHubSmokeCommandResult {
  const parsed = json as {
    readonly full_name?: unknown;
    readonly private?: unknown;
    readonly default_branch?: unknown;
    readonly has_discussions?: unknown;
    readonly permissions?: unknown;
  };
  if (
    typeof parsed.full_name !== "string" ||
    typeof parsed.private !== "boolean" ||
    typeof parsed.default_branch !== "string" ||
    typeof parsed.has_discussions !== "boolean"
  ) {
    return { ok: false, owner, repo, error: "GitHub repository response did not include expected metadata" };
  }

  const permissions = parsePermissions(parsed.permissions);
  return {
    ok: true,
    owner,
    repo,
    fullName: parsed.full_name,
    visibility: parsed.private ? "private" : "public",
    defaultBranch: parsed.default_branch,
    discussionsEnabled: parsed.has_discussions,
    ...(permissions === undefined ? {} : { permissions }),
  };
}

export async function githubSmokeCommand(options: GitHubSmokeCommandOptions): Promise<GitHubSmokeCommandResult> {
  const env = options.env ?? process.env;
  const token = env[options.tokenEnv];
  if (token === undefined || token.length === 0) {
    return {
      ok: false,
      owner: options.owner,
      repo: options.repo,
      error: `Missing GitHub token environment variable: ${options.tokenEnv}`,
    };
  }

  const fetcher = options.fetch ?? fetch;
  try {
    const response = await fetcher(`https://api.github.com/repos/${options.owner}/${options.repo}`, {
      method: "GET",
      headers: headers(token),
    });
    if (!response.ok) {
      return { ok: false, owner: options.owner, repo: options.repo, error: `GitHub request failed with HTTP ${response.status}` };
    }

    return parseRepository(options.owner, options.repo, await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, owner: options.owner, repo: options.repo, error: message };
  }
}
