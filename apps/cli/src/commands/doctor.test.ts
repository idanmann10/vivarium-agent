import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
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
});
