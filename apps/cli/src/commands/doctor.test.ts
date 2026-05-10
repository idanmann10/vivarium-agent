import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { doctorCommand, type DoctorCommandRunner } from "./doctor.js";

const blockedRunner: DoctorCommandRunner = ({ command, args, cwd }) => {
  const text = [command, ...args].join(" ");

  if (text === "git remote -v" && cwd === "/agent") {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  if (text === "git remote -v" && cwd === "/world") {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  if (text === "gh auth status") {
    return { exitCode: 1, stdout: "", stderr: "The token in default is invalid." };
  }

  if (text === "docker --version") {
    return { exitCode: 0, stdout: "Docker version 29.4.1, build 055a478ea9", stderr: "" };
  }

  if (text === "docker compose version") {
    return { exitCode: 1, stdout: "", stderr: "docker: unknown command: docker compose" };
  }

  if (text === "docker-compose version") {
    return { exitCode: 1, stdout: "", stderr: "" };
  }

  return { exitCode: 127, stdout: "", stderr: `unexpected command: ${text}` };
};

const mismatchedRemoteRunner: DoctorCommandRunner = (run) => {
  const text = [run.command, ...run.args].join(" ");
  if (text === "git remote -v" && run.cwd === "/agent") {
    return {
      exitCode: 0,
      stdout: "origin\tgit@github.com:owner/wrong-agent.git (fetch)\norigin\tgit@github.com:owner/wrong-agent.git (push)\n",
      stderr: "",
    };
  }

  if (text === "git remote -v" && run.cwd === "/world") {
    return {
      exitCode: 0,
      stdout: "origin\thttps://github.com/other/world-final.git (fetch)\norigin\thttps://github.com/other/world-final.git (push)\n",
      stderr: "",
    };
  }

  return blockedRunner(run);
};

const missingDockerRunner: DoctorCommandRunner = (run) => {
  const text = [run.command, ...run.args].join(" ");
  if (text === "docker --version" || text === "docker compose version" || text === "docker-compose version") {
    return { exitCode: 1, stdout: "", stderr: "missing docker" };
  }

  return blockedRunner(run);
};

function markdownHeadingAnchors(markdown: string): ReadonlySet<string> {
  return new Set(
    [...markdown.matchAll(/^##+ (.+)$/gm)].flatMap(([, heading]) =>
      heading === undefined
        ? []
        : [
            heading
              .replace(/`/g, "")
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .trim()
              .replace(/\s+/g, "-"),
          ],
    ),
  );
}

describe("doctorCommand", () => {
  test("keeps the default offline-local checks stable", () => {
    expect(doctorCommand()).toEqual({
      ok: true,
      checks: ["state:in-memory", "provider:local", "world:filesystem"],
    });
  });

  test("reports live readiness blockers with injected probes", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { GH_PAGER: "cat" },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("agent.remote:missing");
    expect(result.checks).toContain("world.remote:missing");
    expect(result.checks).toContain("provider.env:missing");
    expect(result.checks).toContain("github.env:missing");
    expect(result.checks).toContain("github.auth:invalid");
    expect(result.checks).toContain("docker:installed");
    expect(result.checks).toContain("docker.compose:missing");
  });

  test("returns next actions for failed live readiness checks", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { GH_PAGER: "cat" },
      runner: blockedRunner,
    });

    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "agent.name:missing",
        env: expect.arrayContaining(["VIVARIUM_AGENT_REPO_NAME"]),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "agent.remote:missing",
        command: expect.stringContaining('git -C "/agent" remote add origin'),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "world.remote:missing",
        command: expect.stringContaining('git -C "/world" remote add origin'),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "provider.openrouter:missing",
        env: expect.arrayContaining(["OPENROUTER_API_KEY"]),
        command: expect.stringContaining('bun "/agent/apps/cli/src/index.ts" providers configure'),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "world.subscriptionsPath:missing",
        command: expect.stringContaining('bun "/agent/apps/cli/src/index.ts" world subscribe'),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "github.auth:invalid",
        command: expect.stringContaining("gh auth status"),
      }),
    );
  });

  test("returns next-action guide anchors that exist in the live-readiness guide", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { GH_PAGER: "cat" },
      runner: missingDockerRunner,
    });
    const anchors = markdownHeadingAnchors(readFileSync("docs/guides/live-readiness.md", "utf8"));

    for (const action of result.nextActions ?? []) {
      const [, anchor] = action.guide.split("#");
      if (anchor !== undefined) {
        expect(anchors.has(anchor), `${action.check} guide ${action.guide} should reference an existing heading`).toBe(true);
      }
    }
  });

  test("reports placeholder repo names as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "the-agent",
        VIVARIUM_WORLD_REPO_NAME: "the-world",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("agent.name:placeholder");
    expect(result.checks).toContain("world.name:placeholder");
  });

  test("reports unfilled angle-bracket template values as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "<final-agent-repo>",
        VIVARIUM_WORLD_REPO_NAME: "<final-world-repo>",
        VIVARIUM_GITHUB_OWNER: "<github-owner-or-org>",
        VIVARIUM_GITHUB_REPOSITORY_ID: "<world-repository-node-id>",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "<discussion-category-node-id>",
        VIVARIUM_CANONICAL_WORLD_REF: "<canonical-world-remote-url>",
        VIVARIUM_PRIVATE_WORLD_REF: "<private-world-remote-url>",
        ANTHROPIC_API_KEY: "<redacted-anthropic-key>",
        OPENROUTER_API_KEY: "<redacted-openrouter-key>",
        VIVARIUM_OAI_COMPAT_API_KEY: "<redacted-private-oai-compatible-key>",
        VIVARIUM_OAI_COMPAT_BASE_URL: "<private-oai-compatible-base-url>",
        VIVARIUM_OAI_COMPAT_MODEL: "<private-fine-tune-model>",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "<internal-api-health-url>",
        GITHUB_TOKEN: "<redacted-github-token>",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        "agent.name:placeholder",
        "world.name:placeholder",
        "world.canonicalRef:placeholder",
        "world.privateForkRef:placeholder",
        "provider.env:placeholder",
        "provider.anthropic:placeholder",
        "provider.openrouter:placeholder",
        "provider.privateOaiCompat:placeholder",
        "internalApi.healthUrl:placeholder",
        "github.env:placeholder",
        "github.owner:placeholder",
        "github.repositoryId:placeholder",
        "github.discussionCategoryId:placeholder",
      ]),
    );
  });

  test("reports missing GitHub target metadata as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("github.owner:missing");
    expect(result.checks).toContain("github.repositoryId:missing");
    expect(result.checks).toContain("github.discussionCategoryId:missing");
  });

  test("reports missing v1 provider targets as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("provider.anthropic:missing");
    expect(result.checks).toContain("provider.openrouter:configured");
    expect(result.checks).toContain("provider.privateOaiCompat:missing");
  });

  test("reports missing internal API credential metadata as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("credentials.path:missing");
    expect(result.checks).toContain("internalApi.credentialName:missing");
    expect(result.checks).toContain("internalApi.healthUrl:missing");
  });

  test("reports missing canonical and private world subscription metadata as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_CREDENTIALS_PATH: "/tmp/vivarium-credentials.enc",
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("world.subscriptionsPath:missing");
    expect(result.checks).toContain("world.canonicalRef:missing");
    expect(result.checks).toContain("world.privateForkRef:missing");
  });

  test("reports missing provider profile metadata as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: "/tmp/vivarium-world-subscriptions.json",
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_CREDENTIALS_PATH: "/tmp/vivarium-credentials.enc",
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("provider.profilesPath:missing");
    expect(result.checks).toContain("provider.anthropicProfile:missing");
    expect(result.checks).toContain("provider.openrouterProfile:missing");
    expect(result.checks).toContain("provider.privateOaiCompatProfile:missing");
  });

  test("reports configured but missing readiness files as unavailable", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-readiness-files-"));
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: join(root, "world-subscriptions.json"),
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_PROVIDER_PROFILES_PATH: join(root, "provider-profiles.json"),
        VIVARIUM_ANTHROPIC_PROVIDER_PROFILE: "anthropic-main",
        VIVARIUM_OPENROUTER_PROVIDER_PROFILE: "openrouter",
        VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE: "private-finetune",
        VIVARIUM_CREDENTIALS_PATH: join(root, "credentials.enc"),
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("world.subscriptionsPath:unavailable");
    expect(result.checks).toContain("provider.profilesPath:unavailable");
    expect(result.checks).toContain("credentials.path:unavailable");
  });

  test("reports configured provider profile names missing from the profiles file", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-provider-profiles-"));
    const profilesPath = join(root, "provider-profiles.json");
    writeFileSync(
      profilesPath,
      `${JSON.stringify({
        profiles: [
          {
            name: "unrelated",
            kind: "openai-compat",
            apiKeyEnv: "OPENROUTER_API_KEY",
            model: "openrouter/test-model",
            capabilities: ["chat"],
            contextWindow: 128000,
            costClass: "medium",
          },
        ],
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: "/tmp/vivarium-world-subscriptions.json",
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_PROVIDER_PROFILES_PATH: profilesPath,
        VIVARIUM_ANTHROPIC_PROVIDER_PROFILE: "anthropic-main",
        VIVARIUM_OPENROUTER_PROVIDER_PROFILE: "openrouter",
        VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE: "private-finetune",
        VIVARIUM_CREDENTIALS_PATH: "/tmp/vivarium-credentials.enc",
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("provider.profilesPath:configured");
    expect(result.checks).toContain("provider.anthropicProfile:unavailable");
    expect(result.checks).toContain("provider.openrouterProfile:unavailable");
    expect(result.checks).toContain("provider.privateOaiCompatProfile:unavailable");
  });

  test("reports configured world refs missing from the subscriptions file", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-world-subscriptions-"));
    const subscriptionsPath = join(root, "world-subscriptions.json");
    writeFileSync(
      subscriptionsPath,
      `${JSON.stringify({
        worlds: [
          {
            label: "unrelated",
            root: "/tmp/unrelated-world",
            priority: 0,
            ref: "git@github.com:owner/unrelated-world.git",
            autoPushEnabled: false,
          },
        ],
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: subscriptionsPath,
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("world.subscriptionsPath:configured");
    expect(result.checks).toContain("world.canonicalRef:unavailable");
    expect(result.checks).toContain("world.privateForkRef:unavailable");
  });

  test("reports remotes that do not match configured owner and repo names", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: mismatchedRemoteRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("agent.remote:mismatch");
    expect(result.checks).toContain("world.remote:mismatch");
  });
});
