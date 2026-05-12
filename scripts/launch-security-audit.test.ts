import { describe, expect, test } from "bun:test";

import {
  analyzeLaunchSecurity,
  parseGitHubErrorStatusCode,
  securityFeatureStatusFromMetadata,
  type LaunchSecurityEvidence,
} from "./launch-security-audit.js";

const readyWorld: LaunchSecurityEvidence["world"] = {
  name: "vivarium-world",
  private: false,
  visibility: "public",
  hasIssues: true,
  hasDiscussions: true,
  allowAutoMerge: true,
  deleteBranchOnMerge: true,
  dependabotSecurityUpdates: "enabled",
  privateVulnerabilityReporting: "enabled",
  secretScanning: "enabled",
  pushProtection: "enabled",
  dependabotAlerts: 0,
  secretScanningAlerts: 0,
  codeScanningAlerts: 0,
  branchProtection: "missing",
  rulesets: 0,
};

describe("launch security audit", () => {
  test("parses GitHub CLI status codes from common error formats", () => {
    expect(parseGitHubErrorStatusCode("gh: Branch not protected (HTTP 404)")).toBe(404);
    expect(parseGitHubErrorStatusCode('{"message":"Not Found","status":"404"}')).toBe(404);
    expect(parseGitHubErrorStatusCode("HTTP/2.0 403 Forbidden")).toBe(403);
  });

  test("treats unavailable security analysis metadata as unavailable feature status", () => {
    expect(
      securityFeatureStatusFromMetadata({ security_and_analysis: null }, "secret_scanning"),
    ).toBe("unavailable");
  });

  test("blocks launch when the agent is still private and post-public security checks are unavailable", () => {
    const audit = analyzeLaunchSecurity({
      agent: {
        name: "vivarium-agent",
        private: true,
        visibility: "private",
        hasIssues: true,
        hasDiscussions: true,
        allowAutoMerge: true,
        deleteBranchOnMerge: true,
        dependabotSecurityUpdates: "unknown",
        privateVulnerabilityReporting: "unavailable",
        secretScanning: "unavailable",
        pushProtection: "unavailable",
        dependabotAlerts: 0,
        secretScanningAlerts: "unavailable",
        codeScanningAlerts: "unavailable",
        branchProtection: "missing",
        rulesets: 0,
      },
      world: readyWorld,
    });

    expect(audit.ok).toBe(false);
    expect(audit.blockers).toEqual(
      expect.arrayContaining([
        "vivarium-agent.visibility:private",
        "vivarium-agent.privateVulnerabilityReporting:unavailable",
        "vivarium-agent.secretScanning:unavailable",
        "vivarium-agent.pushProtection:unavailable",
        "vivarium-agent.codeScanningAlerts:unavailable",
      ]),
    );
    expect(audit.manualDecisions).toContain(
      "vivarium-agent.branchProtectionOrRulesets:decision-required",
    );
    expect(audit.manualDecisions).toContain(
      "vivarium-world.branchProtectionOrRulesets:decision-required",
    );
  });

  test("passes when both repositories are public with clean security signals and a recorded protection decision", () => {
    const audit = analyzeLaunchSecurity({
      agent: {
        name: "vivarium-agent",
        private: false,
        visibility: "public",
        hasIssues: true,
        hasDiscussions: true,
        allowAutoMerge: true,
        deleteBranchOnMerge: true,
        dependabotSecurityUpdates: "enabled",
        privateVulnerabilityReporting: "enabled",
        secretScanning: "enabled",
        pushProtection: "enabled",
        dependabotAlerts: 0,
        secretScanningAlerts: 0,
        codeScanningAlerts: 0,
        branchProtection: "enabled",
        rulesets: 0,
      },
      world: { ...readyWorld, branchProtection: "enabled" },
    });

    expect(audit).toEqual({
      ok: true,
      blockers: [],
      manualDecisions: [],
    });
  });
});
