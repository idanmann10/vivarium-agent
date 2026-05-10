import { describe, expect, test } from "bun:test";

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
});
