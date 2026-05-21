import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  proofCommand,
  proofInitCommand,
  renderProofCommandResult,
  renderProofInitCommandResult,
} from "./proof.js";

describe("proofCommand", () => {
  test("creates an evidence manifest from the setup file without raw keys", () => {
    const root = mkdtempSync(join(tmpdir(), "proof-init-"));
    const evidencePath = join(root, "v1-evidence.json");

    const result = proofInitCommand({
      envFilePath: "live-readiness.local.env",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
    });
    const output = renderProofInitCommandResult(result);

    expect(result).toMatchObject({
      ok: true,
      written: true,
      envFilePath: "live-readiness.local.env",
      path: evidencePath,
    });
    expect(readFileSync(evidencePath, "utf8")).toContain('"realGoals": []');
    expect(statSync(evidencePath).mode & 0o777).toBe(0o600);
    expect(output).toContain("Vivarium Proof Init");
    expect(output).toContain("Status: written");
    expect(output).toContain(`Evidence manifest: ${evidencePath}`);
    expect(output).toContain("vivarium proof");
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
    expect(output).not.toContain("live evidence-init");
  });

  test("blocks evidence manifest creation when setup is not ready", () => {
    const output = renderProofInitCommandResult(
      proofInitCommand({ envFilePath: "live-readiness.local.env" }),
    );

    expect(output).toContain("Status: blocked");
    expect(output).toContain("Setup file: live-readiness.local.env");
    expect(output).toContain("Reason: Setup file is missing or unreadable.");
    expect(output).toContain("vivarium setup live");
    expect(output).toContain("vivarium proof init");
    expect(output).not.toContain("vivarium connect init");
    expect(output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
  });

  test("renders a friendly setup-needed proof checklist without raw evidence keys", () => {
    const result = proofCommand({ envFilePath: "live-readiness.local.env" });
    const output = renderProofCommandResult(result);

    expect(result.ok).toBe(false);
    expect(output).toContain("Vivarium Proof");
    expect(output).toContain("Status: blocked");
    expect(output).toContain("Setup file: live-readiness.local.env");
    expect(output).toContain("Evidence manifest: not configured yet");
    expect(output).toContain("Proof checklist");
    expect(output).toContain("[needs] Real coding goals");
    expect(output).toContain("\n      vivarium setup live\n");
    expect(output).toContain("\n      vivarium connect\n");
    expect(output).toContain("\n      vivarium connect signup\n");
    expect(output).toContain("\n      vivarium connect fill\n");
    expect(output).toContain("\n      vivarium connect setup --confirm-write\n");
    expect(output.indexOf("vivarium connect signup")).toBeLessThan(output.indexOf("vivarium connect fill"));
    expect(output.indexOf("vivarium connect fill")).toBeLessThan(output.indexOf("vivarium connect setup --confirm-write"));
    expect(output).toContain("vivarium connect smoke");
    expect(output).toContain(
      [
        "  [3] Prepare live evidence",
        "      vivarium proof init",
        "      vivarium proof",
      ].join("\n"),
    );
    expect(output).toContain("vivarium doctor --live");
    expect(output).not.toContain("vivarium doctor --live --env-file live-readiness.local.env");
    expect(output).not.toContain("vivarium connect init");
    expect(output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
    expect(output).not.toContain("realGoals");
    expect(output).not.toContain("providerSmokes");
  });

  test("summarizes an evidence manifest skeleton in plain language", () => {
    const root = mkdtempSync(join(tmpdir(), "proof-skeleton-"));
    const evidencePath = join(root, "v1-evidence.json");
    writeFileSync(
      evidencePath,
      JSON.stringify(
        {
          starterPack: { skillCount: 0, traceCount: 0, firstRunReferences: [] },
          realGoals: [],
          providerSmokes: { anthropic: "", openRouter: "", privateOaiCompat: "" },
          internalCredentialSmoke: "",
          worldSubscriptions: { canonical: "", privateFork: "" },
          behaviorLoop: {},
          dreamArtifacts: { skillCandidates: [] },
          publicContribution: { positiveSignals: [], externalPullUses: [] },
          publishedArtifacts: {},
          curationStats: {},
          twoWeekImprovement: { competingSkillReferences: [], refinementEvidence: [] },
        },
        null,
        2,
      ),
      "utf8",
    );

    const output = renderProofCommandResult(
      proofCommand({
        envFilePath: "live-readiness.local.env",
        env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      }),
    );

    expect(output).toContain(`Evidence manifest: ${evidencePath}`);
    expect(output).toContain("Checks: 0 passing, 8 blocked");
    expect(output).toContain("[1] Prepare live readiness\n      vivarium setup live");
    expect(output.indexOf("vivarium setup live")).toBeLessThan(output.indexOf("vivarium connect"));
    expect(output).toContain("vivarium connect signup");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain("[needs] Starter pack: starter skills/traces plus first-run evidence");
    expect(output).toContain("[needs] Real coding goals: 0/5 goals recorded");
    expect(output).toContain("[needs] Provider and credential smokes: provider smokes 0/3, internal credential smoke missing");
    expect(output).toContain("[needs] Two-week improvement: follow-up metrics, competing variants, and refinements");
    expect(output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
    expect(output).not.toContain("internalCredentialSmoke");
  });

  test("points blocked loaded evidence at details instead of repeating proof", () => {
    const root = mkdtempSync(join(tmpdir(), "proof-loaded-details-next-"));
    const evidencePath = join(root, "v1-evidence.json");
    writeFileSync(evidencePath, JSON.stringify({ realGoals: [] }), "utf8");

    const output = renderProofCommandResult(
      proofCommand({
        envFilePath: "live-readiness.local.env",
        env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      }),
    );

    expect(output).toContain("\n      vivarium proof --details\n");
    expect(output).not.toContain("\n      vivarium proof\n");
  });

  test("suggests proof init when the setup file points at a missing manifest", () => {
    const root = mkdtempSync(join(tmpdir(), "proof-missing-manifest-"));
    const evidencePath = join(root, "v1-evidence.json");
    const output = renderProofCommandResult(
      proofCommand({
        envFilePath: "custom-live.env",
        env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      }),
    );

    expect(output).toContain(`Evidence manifest: missing at ${evidencePath}`);
    expect(output).toContain(`vivarium proof init --env-file custom-live.env`);
    expect(output).not.toContain("vivarium live evidence-init");
    expect(output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
  });

  test("keeps private default proof actions on short commands", () => {
    const root = mkdtempSync(join(tmpdir(), "proof-private-default-"));
    const envFilePath = join(root, ".vivarium", "live", "live-readiness.local.env");
    const evidencePath = join(root, ".vivarium", "live", "v1-evidence.json");
    const output = renderProofCommandResult(
      proofCommand({
        envFilePath,
        env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      }),
    );

    expect(output).toContain(`Evidence manifest: missing at ${evidencePath}`);
    expect(output).toContain("\n      vivarium connect\n");
    expect(output).toContain("\n      vivarium connect signup\n");
    expect(output).toContain("\n      vivarium connect fill\n");
    expect(output).toContain("\n      vivarium connect setup --confirm-write\n");
    expect(output).toContain("\n      vivarium proof init\n");
    expect(output).toContain("\n      vivarium proof\n");
    expect(output).toContain("\n      vivarium doctor --live\n");
    expect(output).not.toContain(`--env-file ${envFilePath}`);
  });

  test("shows exact manifest sections only in details mode", () => {
    const root = mkdtempSync(join(tmpdir(), "proof-details-"));
    const evidencePath = join(root, "v1-evidence.json");
    writeFileSync(evidencePath, JSON.stringify({ realGoals: [] }), "utf8");

    const output = renderProofCommandResult(
      proofCommand({
        envFilePath: "live-readiness.local.env",
        env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
        showDetails: true,
      }),
    );

    expect(output).toContain("Exact evidence setup:");
    expect(output).toContain("VIVARIUM_V1_EVIDENCE_PATH");
    expect(output).toContain("realGoals");
    expect(output).toContain("providerSmokes");
  });

  test("keeps superficially filled evidence blocked when doctor needs stricter proof", () => {
    const root = mkdtempSync(join(tmpdir(), "proof-strict-"));
    const evidencePath = join(root, "v1-evidence.json");
    writeFileSync(
      evidencePath,
      JSON.stringify({
        realGoals: Array.from({ length: 5 }, (_item, index) => ({
          id: `goal-${index + 1}`,
          domain: "coding",
          name: `Real coding goal ${index + 1}`,
          date: "2026-05-01",
          evidence: `run-${index + 1}`,
        })),
      }),
      "utf8",
    );

    const output = renderProofCommandResult(
      proofCommand({
        envFilePath: "live-readiness.local.env",
        env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      }),
    );

    expect(output).toContain(
      "[needs] Real coding goals: 5/5 goals recorded; doctor still needs stricter evidence",
    );
  });

  test("does not run live shell probes while applying strict evidence checks", () => {
    const root = mkdtempSync(join(tmpdir(), "proof-no-shell-"));
    const fakeBin = join(root, "bin");
    const sentinel = join(root, "git-was-called");
    const evidencePath = join(root, "v1-evidence.json");
    mkdirSync(fakeBin);
    writeFileSync(
      join(fakeBin, "git"),
      `#!/bin/sh\nprintf invoked > ${JSON.stringify(sentinel)}\nexit 0\n`,
      "utf8",
    );
    chmodSync(join(fakeBin, "git"), 0o755);
    writeFileSync(
      evidencePath,
      JSON.stringify({
        realGoals: Array.from({ length: 5 }, (_item, index) => ({
          id: `goal-${index + 1}`,
          domain: "coding",
          name: `Real coding goal ${index + 1}`,
          date: "2026-05-01",
          evidence: `run-${index + 1}`,
        })),
      }),
      "utf8",
    );

    proofCommand({
      envFilePath: "live-readiness.local.env",
      env: {
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        VIVARIUM_V1_EVIDENCE_PATH: evidencePath,
      },
    });

    expect(existsSync(sentinel)).toBe(false);
  });
});
