import { describe, expect, test } from "bun:test";

import { githubSmokeCommand } from "./github.js";

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
