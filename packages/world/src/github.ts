export interface GitHubIssueRef {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
}

export type GitHubFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface GitHubWorldClientOptions {
  readonly owner: string;
  readonly repo: string;
  readonly token: string;
  readonly fetch?: GitHubFetch;
}

export interface CreatePullRequestRequest {
  readonly title: string;
  readonly body: string;
  readonly head: string;
  readonly base: string;
}

export interface CreateIssueRequest {
  readonly title: string;
  readonly body: string;
  readonly labels: readonly string[];
}

export interface CreateDiscussionRequest {
  readonly repositoryId: string;
  readonly categoryId: string;
  readonly title: string;
  readonly body: string;
}

export interface NumberedGitHubUrl {
  readonly url: string;
  readonly number: number;
}

export interface GitHubDiscussionUrl {
  readonly url: string;
  readonly id: string;
}

export interface GitHubWorldClient {
  createPullRequest(request: CreatePullRequestRequest): Promise<NumberedGitHubUrl>;
  createIssue(request: CreateIssueRequest): Promise<NumberedGitHubUrl>;
  createDiscussion(request: CreateDiscussionRequest): Promise<GitHubDiscussionUrl>;
}

function headers(token: string): Record<string, string> {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
  };
}

async function githubJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`GitHub request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

function numberedUrl(json: unknown): NumberedGitHubUrl {
  const parsed = json as { readonly html_url?: unknown; readonly number?: unknown };
  if (typeof parsed.html_url !== "string" || typeof parsed.number !== "number") {
    throw new Error("GitHub REST response did not include html_url and number");
  }

  return { url: parsed.html_url, number: parsed.number };
}

function discussionUrl(json: unknown): GitHubDiscussionUrl {
  const parsed = json as {
    readonly data?: {
      readonly createDiscussion?: {
        readonly discussion?: {
          readonly url?: unknown;
          readonly id?: unknown;
        };
      };
    };
  };
  const discussion = parsed.data?.createDiscussion?.discussion;
  if (typeof discussion?.url !== "string" || typeof discussion.id !== "string") {
    throw new Error("GitHub GraphQL response did not include discussion url and id");
  }

  return { url: discussion.url, id: discussion.id };
}

export function createGitHubWorldClient(options: GitHubWorldClientOptions): GitHubWorldClient {
  const fetcher = options.fetch ?? fetch;
  const restBase = `https://api.github.com/repos/${options.owner}/${options.repo}`;

  return {
    async createPullRequest(request) {
      const response = await fetcher(`${restBase}/pulls`, {
        method: "POST",
        headers: headers(options.token),
        body: JSON.stringify(request),
      });
      return numberedUrl(await githubJson(response));
    },
    async createIssue(request) {
      const response = await fetcher(`${restBase}/issues`, {
        method: "POST",
        headers: headers(options.token),
        body: JSON.stringify(request),
      });
      return numberedUrl(await githubJson(response));
    },
    async createDiscussion(request) {
      const response = await fetcher("https://api.github.com/graphql", {
        method: "POST",
        headers: headers(options.token),
        body: JSON.stringify({
          query: `
            mutation CreateDiscussion($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
              createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
                discussion { id url }
              }
            }
          `,
          variables: request,
        }),
      });
      return discussionUrl(await githubJson(response));
    },
  };
}
