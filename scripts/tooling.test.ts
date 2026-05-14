import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

interface PackageJson {
  readonly name?: string;
  readonly private?: boolean;
  readonly description?: string;
  readonly license?: string;
  readonly repository?: {
    readonly type?: string;
    readonly url?: string;
  };
  readonly bugs?: {
    readonly url?: string;
  };
  readonly homepage?: string;
  readonly scripts?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

interface KnipWorkspaceConfig {
  readonly entry?: readonly string[];
  readonly project?: readonly string[];
}

interface KnipConfig {
  readonly entry?: readonly string[];
  readonly project?: readonly string[];
  readonly ignoreDependencies?: readonly string[];
  readonly workspaces?: Record<string, KnipWorkspaceConfig>;
}

function rootPackage(): PackageJson {
  return JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;
}

function knipConfig(): KnipConfig {
  return JSON.parse(readFileSync("knip.json", "utf8")) as KnipConfig;
}

describe("root toolchain wiring", () => {
  test("includes the Phase 0 JavaScript tooling named in the roadmap", () => {
    const packageJson = rootPackage();

    for (const dependency of ["@changesets/cli", "knip", "oxlint", "oxfmt", "turbo", "vitest"]) {
      expect(packageJson.devDependencies).toHaveProperty(dependency);
    }
  });

  test("exposes OXC lint and format checks as root scripts", () => {
    const scripts = rootPackage().scripts;

    expect(scripts?.lint).toContain("oxlint");
    expect(scripts?.["format:check"]).toContain("oxfmt --check");
  });

  test("exposes a public release safety scan", () => {
    const scripts = rootPackage().scripts;

    expect(scripts?.["public-release:scan"]).toBe("bun run scripts/public-release-scan.ts");
    expect(scripts?.["format:check"]).toContain("scripts/public-release-scan.ts");
    expect(scripts?.["format:check"]).toContain("scripts/public-release-scan.test.ts");
  });

  test("exposes a tested one-line installer", () => {
    const scripts = rootPackage().scripts;
    const installer = readFileSync("scripts/install.sh", "utf8");

    expect(scripts?.["format:check"]).toContain("scripts/install.test.ts");
    expect(installer).toContain("Vivarium Agent Installer");
    expect(installer).toContain("VIVARIUM_INSTALL_DIR");
    expect(installer).toContain("VIVARIUM_BIN_DIR");
    expect(installer).toContain("Command path:");
    expect(installer).toContain("setup_args=(apps/cli/src/main.ts setup");
    expect(installer).toContain("--github-owner");
    expect(installer).toContain("--canonical-world-ref");
  });

  test("keeps local runtime state untracked", () => {
    const gitignore = readFileSync(".gitignore", "utf8");

    expect(gitignore).toContain(".vivarium/");
  });

  test("exposes a launch security audit", () => {
    const scripts = rootPackage().scripts;

    expect(scripts?.["launch:security-audit"]).toBe("bun run scripts/launch-security-audit.ts");
    expect(scripts?.["format:check"]).toContain("scripts/launch-security-audit.ts");
    expect(scripts?.["format:check"]).toContain("scripts/launch-security-audit.test.ts");
  });

  test("exposes a workspace-aware Knip dependency gate", () => {
    const packageJson = rootPackage();
    const config = knipConfig();

    expect(packageJson.scripts?.knip ?? "").toContain(
      "knip --include dependencies,unlisted,unresolved --no-config-hints",
    );
    expect(config.entry).toBeUndefined();
    expect(config.project).toBeUndefined();
    expect(config.ignoreDependencies).toEqual(
      expect.arrayContaining(["drizzle-kit", "turbo", "vitest"]),
    );

    for (const workspace of [
      ".",
      "apps/cli",
      "apps/daemon",
      "packages/core",
      "packages/eval",
      "packages/providers",
      "packages/runtime",
      "packages/state",
      "packages/tools",
      "packages/world",
    ]) {
      expect(Object.hasOwn(config.workspaces ?? {}, workspace)).toBe(true);
      expect(config.workspaces?.[workspace]?.entry?.length).toBeGreaterThan(0);
      expect(config.workspaces?.[workspace]?.project?.length).toBeGreaterThan(0);
    }
  });

  test("includes public-facing package metadata", () => {
    const packageJson = rootPackage();

    expect(packageJson.name).toBe("vivarium-agent");
    expect(packageJson.private).toBe(true);
    expect(packageJson.description).toContain("local-first");
    expect(packageJson.license).toBe("MIT");
    expect(packageJson.repository?.type).toBe("git");
    expect(packageJson.repository?.url).toContain("vivarium-agent");
    expect(packageJson.bugs?.url).toContain("vivarium-agent/issues");
    expect(packageJson.homepage).toContain("vivarium-agent");
  });
});
