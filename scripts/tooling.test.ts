import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

interface PackageJson {
  readonly scripts?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

function rootPackage(): PackageJson {
  return JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;
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
});
