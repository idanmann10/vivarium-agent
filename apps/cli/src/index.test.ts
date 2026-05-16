import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as cli from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPackageRoot = resolve(__dirname, "..");

const readCliPackageFile = (relativePath: string): string => {
  return readFileSync(resolve(cliPackageRoot, relativePath), "utf8");
};

describe("CLI public API", () => {
  test("exports every implemented world command helper", () => {
    const exports = cli as unknown as Readonly<Record<string, unknown>>;

    expect(typeof exports.listWorldSubscriptionsCommand).toBe("function");
    expect(typeof exports.searchWorldCommand).toBe("function");
    expect(typeof exports.renderSearchWorldCommandResult).toBe("function");
    expect(typeof exports.subscribeWorldCommand).toBe("function");
    expect(typeof exports.renderWorldSubscriptionsCommandResult).toBe("function");
    expect(typeof exports.pullWorldCommand).toBe("function");
    expect(typeof exports.renderPullWorldCommandResult).toBe("function");
    expect(typeof exports.verifyWorldTransmissionCommand).toBe("function");
    expect(typeof exports.renderVerifyWorldTransmissionCommandResult).toBe("function");
    expect(typeof exports.helpCommand).toBe("function");
    expect(typeof exports.renderHelpCommandResult).toBe("function");
    expect(typeof exports.launchHandoffCommand).toBe("function");
    expect(typeof exports.renderLaunchHandoffCommandResult).toBe("function");
    expect(typeof exports.modelCommand).toBe("function");
    expect(typeof exports.renderModelCommandResult).toBe("function");
    expect(typeof exports.liveEnvInitCommand).toBe("function");
    expect(typeof exports.renderLiveEnvInitCommandResult).toBe("function");
    expect(typeof exports.renderConnectInitCommandResult).toBe("function");
    expect(typeof exports.connectSignupCommand).toBe("function");
    expect(typeof exports.renderConnectSignupCommandResult).toBe("function");
    expect(typeof exports.proofCommand).toBe("function");
    expect(typeof exports.proofInitCommand).toBe("function");
    expect(typeof exports.renderProofCommandResult).toBe("function");
    expect(typeof exports.renderProofInitCommandResult).toBe("function");
    expect(typeof exports.renderLiveEvidenceInitCommandResult).toBe("function");
    expect(typeof exports.renderLiveSetupCommandResult).toBe("function");
    expect(typeof exports.renderStatusCommandResult).toBe("function");
    expect(typeof exports.setupCommand).toBe("function");
    expect(typeof exports.renderSetupCommandResult).toBe("function");
    expect(typeof exports.renderInitCommandResult).toBe("function");
    expect(typeof exports.renderRunCommandResult).toBe("function");
    expect(typeof exports.renderListSkillsCommandResult).toBe("function");
    expect(typeof exports.renderDreamCommandResult).toBe("function");
    expect(typeof exports.renderIdentitySummaryCommandResult).toBe("function");
    expect(typeof exports.renderIdentityStageCommandResult).toBe("function");
    expect(typeof exports.renderIdentityHistoryCommandResult).toBe("function");
    expect(typeof exports.renderCurriculumReadCommandResult).toBe("function");
    expect(typeof exports.renderCurriculumProgressCommandResult).toBe("function");
    expect(typeof exports.renderPublishListCommandResult).toBe("function");
    expect(typeof exports.renderPublishRunCommandResult).toBe("function");
    expect(typeof exports.renderPublishTraceCommandResult).toBe("function");
    expect(typeof exports.renderDoctorCommandResult).toBe("function");
    expect(typeof exports.updateCommand).toBe("function");
    expect(typeof exports.renderUpdateCommandResult).toBe("function");
    expect(typeof exports.liveEvidenceInitCommand).toBe("function");
    expect(typeof exports.renderProviderProfilesCommandResult).toBe("function");
    expect(typeof exports.renderProviderSmokeCommandResult).toBe("function");
    expect(typeof exports.renderAddCredentialCommandResult).toBe("function");
    expect(typeof exports.renderListCredentialsCommandResult).toBe("function");
    expect(typeof exports.renderCredentialSmokeCommandResult).toBe("function");
    expect(typeof exports.renderGitHubSmokeCommandResult).toBe("function");
    expect(typeof exports.renderGitHubDiscussionCommandResult).toBe("function");
    expect(typeof exports.renderGitHubPullRequestCommandResult).toBe("function");
    expect(typeof exports.renderGitHubWorkflowRunsCommandResult).toBe("function");
    expect(typeof exports.renderDaemonSmokeCommandResult).toBe("function");
  });
});

describe("CLI entrypoint boundary", () => {
  test("uses a dedicated process entrypoint", () => {
    const packageJson = JSON.parse(readCliPackageFile("package.json")) as {
      bin?: Record<string, string>;
    };

    expect(packageJson.bin?.vivarium).toBe("./src/main.ts");
    expect(packageJson.bin?.["the-agent"]).toBeUndefined();

    const mainPath = resolve(cliPackageRoot, "src/main.ts");
    const mainSource = readCliPackageFile("src/main.ts");
    const indexSource = readCliPackageFile("src/index.ts");

    expect(existsSync(mainPath)).toBe(true);
    expect(mainSource).toContain(
      'import { CliUsageError, dispatchCliCommand } from "./dispatcher.js";',
    );
    expect(mainSource).toContain(
      'import { applyVivariumTerminalTheme, renderVivariumError } from "./commands/branding.js";',
    );
    expect(mainSource).toContain("dispatchCliCommand(Bun.argv.slice(2))");
    expect(mainSource).toContain("applyVivariumTerminalTheme(result.output");
    expect(mainSource).toContain("applyVivariumTerminalTheme(renderVivariumError(message, renderOptions)");
    expect(indexSource).not.toContain("import.meta.main");
  });

  test("renders branded usage errors from the process entrypoint", () => {
    const result = Bun.spawnSync(["bun", "apps/cli/src/main.ts", "run"], {
      cwd: resolve(cliPackageRoot, "../.."),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, NO_COLOR: "1" },
    });

    const stderr = result.stderr.toString();

    expect(result.exitCode).toBe(1);
    expect(result.stdout.toString()).toBe("");
    expect(stderr).toContain("Vivarium Error");
    expect(stderr).toContain("VIVARIUM // local memory // world culture");
    expect(stderr).toContain("Message: Missing required --goal");
    expect(stderr).toContain("Next command:");
    expect(stderr).toContain("vivarium help");
  });

  test("renders guided missing env file errors from the process entrypoint", () => {
    const envPath = join(mkdtempSync(join(tmpdir(), "cli-missing-env-")), "live-readiness.local.env");
    const result = Bun.spawnSync(
      ["bun", "apps/cli/src/main.ts", "model", "--env-file", envPath],
      {
        cwd: resolve(cliPackageRoot, "../.."),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, NO_COLOR: "1" },
      },
    );

    const stderr = result.stderr.toString();

    expect(result.exitCode).toBe(1);
    expect(result.stdout.toString()).toBe("");
    expect(stderr).toContain("Vivarium Error");
    expect(stderr).toContain(`Message: Missing env file: ${envPath}`);
    expect(stderr).toContain("Next commands:");
    expect(stderr).toContain(`vivarium connect init --path ${envPath}`);
    expect(stderr).toContain("vivarium help");
    expect(stderr).not.toContain("ENOENT");
  });
});
