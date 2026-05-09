import { describe, expect, test } from "bun:test";

import { createGitHubWorldClient } from "./github.js";

interface CapturedRequest {
  readonly url: string;
  readonly init: RequestInit;
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("GitHub world client", () => {
  test("creates pull requests through REST", async () => {
    const captured: CapturedRequest[] = [];
    const client = createGitHubWorldClient({
      owner: "owner",
      repo: "world",
      token: "gh-token",
      fetch: async (url, init) => {
        captured.push({ url: String(url), init: init ?? {} });
        return response({ html_url: "https://github.com/owner/world/pull/1", number: 1 });
      },
    });

    await expect(
      client.createPullRequest({
        title: "Add skill",
        body: "Proposal",
        head: "agent:add-skill",
        base: "main",
      }),
    ).resolves.toEqual({ url: "https://github.com/owner/world/pull/1", number: 1 });
    expect(captured[0]?.url).toBe("https://api.github.com/repos/owner/world/pulls");
    expect((captured[0]?.init.headers as Record<string, string>).authorization).toBe("Bearer gh-token");
    expect(JSON.parse(String(captured[0]?.init.body))).toMatchObject({ title: "Add skill" });
  });

  test("creates regression issues through REST", async () => {
    const captured: CapturedRequest[] = [];
    const client = createGitHubWorldClient({
      owner: "owner",
      repo: "world",
      token: "gh-token",
      fetch: async (url, init) => {
        captured.push({ url: String(url), init: init ?? {} });
        return response({ html_url: "https://github.com/owner/world/issues/2", number: 2 });
      },
    });

    await expect(client.createIssue({ title: "Regression", body: "Evidence", labels: ["regression"] })).resolves.toEqual({
      url: "https://github.com/owner/world/issues/2",
      number: 2,
    });
    expect(captured[0]?.url).toBe("https://api.github.com/repos/owner/world/issues");
    expect(JSON.parse(String(captured[0]?.init.body))).toMatchObject({ labels: ["regression"] });
  });

  test("creates RFC discussions through GraphQL", async () => {
    const captured: CapturedRequest[] = [];
    const client = createGitHubWorldClient({
      owner: "owner",
      repo: "world",
      token: "gh-token",
      fetch: async (url, init) => {
        captured.push({ url: String(url), init: init ?? {} });
        return response({
          data: {
            createDiscussion: {
              discussion: {
                url: "https://github.com/owner/world/discussions/3",
                id: "D_3",
              },
            },
          },
        });
      },
    });

    await expect(
      client.createDiscussion({
        repositoryId: "R_1",
        categoryId: "C_1",
        title: "RFC",
        body: "Discuss",
      }),
    ).resolves.toEqual({ url: "https://github.com/owner/world/discussions/3", id: "D_3" });
    expect(captured[0]?.url).toBe("https://api.github.com/graphql");
    expect(String(captured[0]?.init.body)).toContain("createDiscussion");
  });
});
