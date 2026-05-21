import { createGitHubWorldClient, type GitHubFetch } from "../../../../packages/world/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

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

export interface GitHubDiscussionCommandOptions {
  readonly owner: string;
  readonly repo: string;
  readonly tokenEnv: string;
  readonly repositoryId: string;
  readonly categoryId: string;
  readonly title: string;
  readonly body: string;
  readonly confirmWrite: boolean;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: GitHubFetch;
}

export interface GitHubPullRequestCommandOptions {
  readonly owner: string;
  readonly repo: string;
  readonly tokenEnv: string;
  readonly title: string;
  readonly body: string;
  readonly head: string;
  readonly base: string;
  readonly confirmWrite: boolean;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: GitHubFetch;
}

export interface GitHubWorkflowRunsCommandOptions {
  readonly owner: string;
  readonly repo: string;
  readonly tokenEnv: string;
  readonly branch?: string;
  readonly limit?: number;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: GitHubFetch;
}

export type GitHubDiscussionCommandResult =
  | {
      readonly ok: true;
      readonly owner: string;
      readonly repo: string;
      readonly discussionId: string;
      readonly discussionUrl: string;
    }
  | {
      readonly ok: false;
      readonly owner: string;
      readonly repo: string;
      readonly error: string;
    };

export type GitHubPullRequestCommandResult =
  | {
      readonly ok: true;
      readonly owner: string;
      readonly repo: string;
      readonly pullRequestNumber: number;
      readonly pullRequestUrl: string;
    }
  | {
      readonly ok: false;
      readonly owner: string;
      readonly repo: string;
      readonly error: string;
    };

export interface GitHubWorkflowRunSummary {
  readonly id: number;
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly url: string;
  readonly headBranch: string;
}

export type GitHubWorkflowRunsCommandResult =
  | {
      readonly ok: true;
      readonly owner: string;
      readonly repo: string;
      readonly runs: readonly GitHubWorkflowRunSummary[];
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

function isPlaceholderValue(value: string): boolean {
  return /^<[^>]+>$/.test(value.trim());
}

function readToken(
  env: Readonly<Record<string, string | undefined>>,
  tokenEnv: string,
): string | undefined {
  const token = env[tokenEnv]?.trim();
  if (token === undefined || token.length === 0 || isPlaceholderValue(token)) {
    return undefined;
  }

  return token;
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

function parseWorkflowRuns(owner: string, repo: string, json: unknown): GitHubWorkflowRunsCommandResult {
  const runs = (json as { readonly workflow_runs?: unknown }).workflow_runs;
  if (!Array.isArray(runs)) {
    return { ok: false, owner, repo, error: "GitHub workflow runs response did not include workflow_runs" };
  }

  const summaries: GitHubWorkflowRunSummary[] = [];
  for (const run of runs) {
    const parsed = run as {
      readonly id?: unknown;
      readonly name?: unknown;
      readonly status?: unknown;
      readonly conclusion?: unknown;
      readonly html_url?: unknown;
      readonly head_branch?: unknown;
    };
    if (
      typeof parsed.id !== "number" ||
      typeof parsed.name !== "string" ||
      typeof parsed.status !== "string" ||
      !(typeof parsed.conclusion === "string" || parsed.conclusion === null) ||
      typeof parsed.html_url !== "string" ||
      typeof parsed.head_branch !== "string"
    ) {
      return { ok: false, owner, repo, error: "GitHub workflow run response did not include expected metadata" };
    }

    summaries.push({
      id: parsed.id,
      name: parsed.name,
      status: parsed.status,
      conclusion: parsed.conclusion,
      url: parsed.html_url,
      headBranch: parsed.head_branch,
    });
  }

  return { ok: true, owner, repo, runs: summaries };
}

function workflowRunsUrl(options: GitHubWorkflowRunsCommandOptions): string {
  const params = new URLSearchParams();
  if (options.branch !== undefined) {
    params.set("branch", options.branch);
  }
  params.set("per_page", String(options.limit ?? 10));
  return `https://api.github.com/repos/${options.owner}/${options.repo}/actions/runs?${params.toString()}`;
}

export async function githubSmokeCommand(options: GitHubSmokeCommandOptions): Promise<GitHubSmokeCommandResult> {
  const env = options.env ?? process.env;
  const token = readToken(env, options.tokenEnv);
  if (token === undefined) {
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

function renderRepositoryHeader(title: string, result: { readonly owner: string; readonly repo: string; readonly ok: boolean }): string[] {
  return [
    renderVivariumGlobe(),
    "",
    title,
    "-".repeat(title.length),
    `Status: ${result.ok ? "ok" : "blocked"}`,
    `Repository: ${result.owner}/${result.repo}`,
  ];
}

export function renderGitHubSmokeCommandResult(result: GitHubSmokeCommandResult): string {
  return [
    ...renderRepositoryHeader("Vivarium GitHub Smoke", result),
    ...(result.ok
      ? [
          `Full name: ${result.fullName}`,
          `Visibility: ${result.visibility}`,
          `Default branch: ${result.defaultBranch}`,
          `Discussions: ${result.discussionsEnabled ? "enabled" : "disabled"}`,
          ...(result.permissions === undefined
            ? []
            : [
                `Permissions: pull=${result.permissions.pull}, push=${result.permissions.push}, admin=${result.permissions.admin}`,
              ]),
        ]
      : [
          `Error: ${result.error}`,
          "",
          "Next command:",
          "  Export a GitHub token, then rerun github smoke.",
        ]),
    "",
  ].join("\n");
}

export async function githubDiscussionCommand(options: GitHubDiscussionCommandOptions): Promise<GitHubDiscussionCommandResult> {
  if (!options.confirmWrite) {
    return { ok: false, owner: options.owner, repo: options.repo, error: "Missing --confirm-write for GitHub discussion creation" };
  }

  const env = options.env ?? process.env;
  const token = readToken(env, options.tokenEnv);
  if (token === undefined) {
    return {
      ok: false,
      owner: options.owner,
      repo: options.repo,
      error: `Missing GitHub token environment variable: ${options.tokenEnv}`,
    };
  }

  try {
    const discussion = await createGitHubWorldClient({
      owner: options.owner,
      repo: options.repo,
      token,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    }).createDiscussion({
      repositoryId: options.repositoryId,
      categoryId: options.categoryId,
      title: options.title,
      body: options.body,
    });

    return {
      ok: true,
      owner: options.owner,
      repo: options.repo,
      discussionId: discussion.id,
      discussionUrl: discussion.url,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, owner: options.owner, repo: options.repo, error: message };
  }
}

export function renderGitHubDiscussionCommandResult(result: GitHubDiscussionCommandResult): string {
  return [
    ...renderRepositoryHeader("Vivarium GitHub Discussion", result),
    ...(result.ok
      ? [`Discussion: ${result.discussionUrl}`, `Discussion ID: ${result.discussionId}`]
      : [
          `Error: ${result.error}`,
          "",
          "Next command:",
          "  Re-run github discussion with --confirm-write after reviewing the body.",
        ]),
    "",
  ].join("\n");
}

export async function githubPullRequestCommand(options: GitHubPullRequestCommandOptions): Promise<GitHubPullRequestCommandResult> {
  if (!options.confirmWrite) {
    return { ok: false, owner: options.owner, repo: options.repo, error: "Missing --confirm-write for GitHub pull request creation" };
  }

  const env = options.env ?? process.env;
  const token = readToken(env, options.tokenEnv);
  if (token === undefined) {
    return {
      ok: false,
      owner: options.owner,
      repo: options.repo,
      error: `Missing GitHub token environment variable: ${options.tokenEnv}`,
    };
  }

  try {
    const pullRequest = await createGitHubWorldClient({
      owner: options.owner,
      repo: options.repo,
      token,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    }).createPullRequest({
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
    });

    return {
      ok: true,
      owner: options.owner,
      repo: options.repo,
      pullRequestNumber: pullRequest.number,
      pullRequestUrl: pullRequest.url,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, owner: options.owner, repo: options.repo, error: message };
  }
}

export function renderGitHubPullRequestCommandResult(result: GitHubPullRequestCommandResult): string {
  return [
    ...renderRepositoryHeader("Vivarium GitHub Pull Request", result),
    ...(result.ok
      ? [`Pull request: ${result.pullRequestUrl}`, `Number: ${result.pullRequestNumber}`]
      : [
          `Error: ${result.error}`,
          "",
          "Next command:",
          "  Re-run github pull-request with --confirm-write after reviewing the branch and body.",
        ]),
    "",
  ].join("\n");
}

export async function githubWorkflowRunsCommand(options: GitHubWorkflowRunsCommandOptions): Promise<GitHubWorkflowRunsCommandResult> {
  const env = options.env ?? process.env;
  const token = readToken(env, options.tokenEnv);
  if (token === undefined) {
    return {
      ok: false,
      owner: options.owner,
      repo: options.repo,
      error: `Missing GitHub token environment variable: ${options.tokenEnv}`,
    };
  }

  const fetcher = options.fetch ?? fetch;
  try {
    const response = await fetcher(workflowRunsUrl(options), {
      method: "GET",
      headers: headers(token),
    });
    if (!response.ok) {
      return { ok: false, owner: options.owner, repo: options.repo, error: `GitHub request failed with HTTP ${response.status}` };
    }

    return parseWorkflowRuns(options.owner, options.repo, await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, owner: options.owner, repo: options.repo, error: message };
  }
}

function renderWorkflowRun(run: GitHubWorkflowRunSummary): readonly string[] {
  return [
    `  ${run.name}`,
    `    Status: ${run.status}`,
    `    Conclusion: ${run.conclusion ?? "pending"}`,
    `    Branch: ${run.headBranch}`,
    `    URL: ${run.url}`,
  ];
}

export function renderGitHubWorkflowRunsCommandResult(result: GitHubWorkflowRunsCommandResult): string {
  return [
    ...renderRepositoryHeader("Vivarium GitHub Workflows", result),
    ...(result.ok
      ? [
          `Runs: ${result.runs.length}`,
          ...(result.runs.length === 0 ? [] : ["", ...result.runs.flatMap(renderWorkflowRun)]),
        ]
      : [
          `Error: ${result.error}`,
          "",
          "Next command:",
          "  Export a GitHub token, then rerun github workflow-runs.",
        ]),
    "",
  ].join("\n");
}
