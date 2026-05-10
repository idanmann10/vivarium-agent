import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("daemon Dockerfile", () => {
  test("installs native dependency build prerequisites before bun install", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const prerequisitesIndex = dockerfile.indexOf("apt-get install");
    const installIndex = dockerfile.indexOf("RUN bun install --frozen-lockfile");

    expect(prerequisitesIndex).toBeGreaterThan(-1);
    expect(prerequisitesIndex).toBeLessThan(installIndex);
    expect(dockerfile).toContain("python3");
    expect(dockerfile).toContain("make");
    expect(dockerfile).toContain("g++");
  });
});
