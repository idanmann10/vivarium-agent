import { describe, expect, test } from "bun:test";

import { githubDiscussionCommand, githubPullRequestCommand, githubSmokeCommand } from "./github.js";

describe("githubSmokeCommand", () => {
  test("returns a missing-env result without calling GitHub", async () => {
    const result = await githubSmokeCommand({
      owner: "owner",
      repo: "world",
      tokenEnv: "VIVARIUM_MISSING_GITHUB_TOKEN",
      env: {},
      fetch: async () => {
        throw new Error("fetch should not run without a token");
      },
    });

    expect(result).toEqual({
      ok: false,
      owner: "owner",
      repo: "world",
      error: "Missing GitHub token environment variable: VIVARIUM_MISSING_GITHUB_TOKEN",
    });
  });

  test("reports read access metadata for a GitHub world repository", async () => {
    const requests: Array<{ readonly url: string; readonly init: RequestInit }> = [];
    const result = await githubSmokeCommand({
      owner: "owner",
      repo: "world",
      tokenEnv: "GITHUB_TOKEN",
      env: { GITHUB_TOKEN: "gh-secret" },
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({
          full_name: "owner/world",
          private: false,
          default_branch: "main",
          has_discussions: true,
          permissions: { pull: true, push: true, admin: false },
        });
      },
    });

    expect(result).toEqual({
      ok: true,
      owner: "owner",
      repo: "world",
      fullName: "owner/world",
      visibility: "public",
      defaultBranch: "main",
      discussionsEnabled: true,
      permissions: { pull: true, push: true, admin: false },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.github.com/repos/owner/world");
    expect(requests[0]?.init.headers).toMatchObject({ authorization: "Bearer gh-secret" });
  });
});

describe("githubDiscussionCommand", () => {
  test("requires explicit write confirmation before reading credentials or calling GitHub", async () => {
    const result = await githubDiscussionCommand({
      owner: "owner",
      repo: "world",
      tokenEnv: "GITHUB_TOKEN",
      repositoryId: "R_1",
      categoryId: "C_1",
      title: "Phase 0 RFC",
      body: "Bootstrap discussion",
      confirmWrite: false,
      env: { GITHUB_TOKEN: "gh-secret" },
      fetch: async () => {
        throw new Error("fetch should not run without confirmation");
      },
    });

    expect(result).toEqual({
      ok: false,
      owner: "owner",
      repo: "world",
      error: "Missing --confirm-write for GitHub discussion creation",
    });
  });

  test("creates a confirmed discussion through the GitHub client", async () => {
    const requests: Array<{ readonly url: string; readonly init: RequestInit }> = [];
    const result = await githubDiscussionCommand({
      owner: "owner",
      repo: "world",
      tokenEnv: "GITHUB_TOKEN",
      repositoryId: "R_1",
      categoryId: "C_1",
      title: "Phase 0 RFC",
      body: "Bootstrap discussion",
      confirmWrite: true,
      env: { GITHUB_TOKEN: "gh-secret" },
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({
          data: {
            createDiscussion: {
              discussion: {
                id: "D_1",
                url: "https://github.com/owner/world/discussions/1",
              },
            },
          },
        });
      },
    });

    expect(result).toEqual({
      ok: true,
      owner: "owner",
      repo: "world",
      discussionId: "D_1",
      discussionUrl: "https://github.com/owner/world/discussions/1",
    });
    expect(requests[0]?.url).toBe("https://api.github.com/graphql");
    expect(requests[0]?.init.headers).toMatchObject({ authorization: "Bearer gh-secret" });
    expect(String(requests[0]?.init.body)).toContain("Phase 0 RFC");
  });
});

describe("githubPullRequestCommand", () => {
  test("requires explicit write confirmation before reading credentials or calling GitHub", async () => {
    const result = await githubPullRequestCommand({
      owner: "owner",
      repo: "world",
      tokenEnv: "GITHUB_TOKEN",
      title: "Add generated skill",
      body: "Generated artifact",
      head: "agent:add-generated-skill",
      base: "main",
      confirmWrite: false,
      env: { GITHUB_TOKEN: "gh-secret" },
      fetch: async () => {
        throw new Error("fetch should not run without confirmation");
      },
    });

    expect(result).toEqual({
      ok: false,
      owner: "owner",
      repo: "world",
      error: "Missing --confirm-write for GitHub pull request creation",
    });
  });

  test("creates a confirmed pull request through the GitHub client", async () => {
    const requests: Array<{ readonly url: string; readonly init: RequestInit }> = [];
    const result = await githubPullRequestCommand({
      owner: "owner",
      repo: "world",
      tokenEnv: "GITHUB_TOKEN",
      title: "Add generated skill",
      body: "Generated artifact",
      head: "agent:add-generated-skill",
      base: "main",
      confirmWrite: true,
      env: { GITHUB_TOKEN: "gh-secret" },
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({ html_url: "https://github.com/owner/world/pull/4", number: 4 });
      },
    });

    expect(result).toEqual({
      ok: true,
      owner: "owner",
      repo: "world",
      pullRequestNumber: 4,
      pullRequestUrl: "https://github.com/owner/world/pull/4",
    });
    expect(requests[0]?.url).toBe("https://api.github.com/repos/owner/world/pulls");
    expect(requests[0]?.init.headers).toMatchObject({ authorization: "Bearer gh-secret" });
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual({
      title: "Add generated skill",
      body: "Generated artifact",
      head: "agent:add-generated-skill",
      base: "main",
    });
  });
});
