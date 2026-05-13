import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
    expect(typeof exports.subscribeWorldCommand).toBe("function");
    expect(typeof exports.pullWorldCommand).toBe("function");
    expect(typeof exports.verifyWorldTransmissionCommand).toBe("function");
    expect(typeof exports.helpCommand).toBe("function");
    expect(typeof exports.renderHelpCommandResult).toBe("function");
    expect(typeof exports.modelCommand).toBe("function");
    expect(typeof exports.renderModelCommandResult).toBe("function");
    expect(typeof exports.liveEnvInitCommand).toBe("function");
    expect(typeof exports.renderLiveEnvInitCommandResult).toBe("function");
    expect(typeof exports.renderLiveEvidenceInitCommandResult).toBe("function");
    expect(typeof exports.renderLiveSetupCommandResult).toBe("function");
    expect(typeof exports.renderStatusCommandResult).toBe("function");
    expect(typeof exports.setupCommand).toBe("function");
    expect(typeof exports.renderSetupCommandResult).toBe("function");
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

    expect(packageJson.bin?.["the-agent"]).toBe("./src/main.ts");

    const mainPath = resolve(cliPackageRoot, "src/main.ts");
    const mainSource = readCliPackageFile("src/main.ts");
    const indexSource = readCliPackageFile("src/index.ts");

    expect(existsSync(mainPath)).toBe(true);
    expect(mainSource).toContain('import { dispatchCliCommand } from "./dispatcher.js";');
    expect(mainSource).toContain("dispatchCliCommand(Bun.argv.slice(2))");
    expect(indexSource).not.toContain("import.meta.main");
  });
});
