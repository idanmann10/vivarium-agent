import { existsSync, readFileSync } from "node:fs";
import { renderVivariumGlobe } from "./branding.js";
import { doctorCommand, type DoctorCommandRunner } from "./doctor.js";
import { renderLaunchSequence } from "./launch-sequence.js";
import {
  liveEvidenceInitCommand,
  type LiveEvidenceInitCommandResult,
} from "./live.js";

export interface ProofCommandOptions {
  readonly envFilePath?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly showDetails?: boolean;
  readonly pathExists?: (path: string) => boolean;
  readonly readFile?: (path: string) => string;
}

export interface ProofCheck {
  readonly label: string;
  readonly ok: boolean;
  readonly detail: string;
  readonly sectionKeys: readonly string[];
}

export type ProofManifestStatus =
  | { readonly kind: "not_configured" }
  | { readonly kind: "missing"; readonly path: string }
  | { readonly kind: "invalid"; readonly path: string; readonly error: string }
  | { readonly kind: "loaded"; readonly path: string };

export interface ProofCommandResult {
  readonly ok: boolean;
  readonly showDetails: boolean;
  readonly envFilePath: string;
  readonly manifestStatus: ProofManifestStatus;
  readonly checks: readonly ProofCheck[];
  readonly nextCommands: readonly string[];
}

export interface ProofInitCommandOptions {
  readonly envFilePath?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly overwrite?: boolean;
  readonly showDetails?: boolean;
}

export interface ProofInitCommandResult {
  readonly ok: boolean;
  readonly written: boolean;
  readonly envFilePath: string;
  readonly showDetails: boolean;
  readonly path?: string;
  readonly sections?: readonly string[];
  readonly error?: string;
  readonly nextCommands: readonly string[];
}

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("<") && trimmed.endsWith(">");
}

function filledText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && !isPlaceholder(value);
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

function recordArray(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<Readonly<Record<string, unknown>>[]>((records, item) => {
    const record = asRecord(item);
    return record === undefined ? records : [...records, record];
  }, []);
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function proofCheck(
  label: string,
  ok: boolean,
  detail: string,
  sectionKeys: readonly string[],
): ProofCheck {
  return { label, ok, detail, sectionKeys };
}

const doctorCheckPrefixesByProofLabel: Readonly<Record<string, readonly string[]>> = {
  "Starter pack": ["v1.starterPack"],
  "Real coding goals": ["v1.realGoals"],
  "Provider and credential smokes": ["v1.providerSmokes", "v1.internalCredentialSmoke"],
  "Behavior loop": ["v1.behaviorLoop"],
  "Dream artifacts": ["v1.dreamArtifacts"],
  "Public contribution": ["v1.publicContribution"],
  "Published artifacts and curation": ["v1.publishedArtifacts", "v1.curationStats"],
  "Two-week improvement": ["v1.twoWeekImprovement"],
};

function isPassingDoctorCheck(check: string): boolean {
  return check.endsWith(":configured") || check.endsWith(":ok") || check.endsWith(":installed");
}

function doctorPrefixPassed(checks: readonly string[], prefix: string): boolean {
  return checks.some((check) => check.startsWith(`${prefix}:`) && isPassingDoctorCheck(check));
}

const proofDoctorRunner: DoctorCommandRunner = () => ({
  exitCode: 127,
  stdout: "",
  stderr: "proof skips external live probes",
});

function applyDoctorStrictness(
  checks: readonly ProofCheck[],
  options: ProofCommandOptions,
): readonly ProofCheck[] {
  if (options.env === undefined) {
    return checks;
  }
  if (!checks.some((check) => check.ok)) {
    return checks;
  }

  const doctor = doctorCommand({
    mode: "live-readiness",
    env: options.env,
    ...(options.envFilePath === undefined ? {} : { envFilePath: options.envFilePath }),
    runner: proofDoctorRunner,
  });

  return checks.map((check) => {
    const prefixes = doctorCheckPrefixesByProofLabel[check.label];
    if (prefixes === undefined) {
      return check;
    }

    const strictOk = prefixes.every((prefix) => doctorPrefixPassed(doctor.checks, prefix));
    if (strictOk) {
      return check;
    }

    return {
      ...check,
      ok: false,
      detail: check.ok ? `${check.detail}; doctor still needs stricter evidence` : check.detail,
    };
  });
}

function emptyChecks(): readonly ProofCheck[] {
  return [
    proofCheck("Starter pack", false, "starter skills/traces plus first-run evidence", [
      "starterPack",
    ]),
    proofCheck("Real coding goals", false, "0/5 goals recorded", ["realGoals"]),
    proofCheck("Provider and credential smokes", false, "provider smokes 0/3, internal credential smoke missing", [
      "providerSmokes",
      "internalCredentialSmoke",
    ]),
    proofCheck("Behavior loop", false, "world subscriptions and behavior-loop evidence", [
      "worldSubscriptions",
      "behaviorLoop",
    ]),
    proofCheck("Dream artifacts", false, "Dream candidates, private/public skill split, anti-pattern, and trace", [
      "dreamArtifacts",
    ]),
    proofCheck("Public contribution", false, "public PR, math gate, positive signals, and pull/use evidence", [
      "publicContribution",
    ]),
    proofCheck("Published artifacts and curation", false, "published world artifacts plus featured stats", [
      "publishedArtifacts",
      "curationStats",
    ]),
    proofCheck("Two-week improvement", false, "follow-up metrics, competing variants, and refinements", [
      "twoWeekImprovement",
    ]),
  ];
}

function summarizeManifest(manifest: Readonly<Record<string, unknown>>): readonly ProofCheck[] {
  const starterPack = asRecord(manifest.starterPack);
  const skillCount = numberValue(starterPack?.skillCount) ?? 0;
  const traceCount = numberValue(starterPack?.traceCount) ?? 0;
  const firstRunCount = stringArray(starterPack?.firstRunReferences).filter(filledText).length;
  const starterReady = skillCount >= 20 && traceCount >= 3 && firstRunCount >= 2;

  const realGoals = recordArray(manifest.realGoals);
  const realGoalEvidenceCount = realGoals.filter((goal) => filledText(goal.evidence)).length;

  const providerSmokes = asRecord(manifest.providerSmokes);
  const providerSmokeCount = [
    providerSmokes?.anthropic,
    providerSmokes?.openRouter,
    providerSmokes?.privateOaiCompat,
  ].filter(filledText).length;
  const internalCredentialSmoke = filledText(manifest.internalCredentialSmoke);

  const worldSubscriptions = asRecord(manifest.worldSubscriptions);
  const behaviorLoop = asRecord(manifest.behaviorLoop);
  const destructiveEndpoint = asRecord(behaviorLoop?.destructiveEndpoint);
  const behaviorReady =
    filledText(worldSubscriptions?.canonical) &&
    filledText(worldSubscriptions?.privateFork) &&
    filledText(behaviorLoop?.antiPatternAvoided) &&
    stringArray(behaviorLoop?.tracesRead).filter(filledText).length >= 2 &&
    filledText(behaviorLoop?.monitorFailurePattern) &&
    filledText(behaviorLoop?.recoverReplan) &&
    filledText(destructiveEndpoint?.run) &&
    recordArray(destructiveEndpoint?.sequence).length >= 4 &&
    filledText(behaviorLoop?.refusal);

  const dreamArtifacts = asRecord(manifest.dreamArtifacts);
  const dreamReady =
    stringArray(dreamArtifacts?.skillCandidates).filter(filledText).length >= 2 &&
    filledText(dreamArtifacts?.internalSkill) &&
    filledText(dreamArtifacts?.internalSkillPrivateFork) &&
    filledText(dreamArtifacts?.internalSkillCanonicalAbsence) &&
    filledText(dreamArtifacts?.publicSkill) &&
    filledText(dreamArtifacts?.antiPattern) &&
    filledText(dreamArtifacts?.trace) &&
    filledText(dreamArtifacts?.traceSourceRun) &&
    filledText(dreamArtifacts?.traceAnnotations);

  const publicContribution = asRecord(manifest.publicContribution);
  const publicReady =
    filledText(publicContribution?.contributorAgent) &&
    filledText(publicContribution?.publicSkillPr) &&
    filledText(publicContribution?.mathGate) &&
    filledText(publicContribution?.autoMerge) &&
    filledText(publicContribution?.canonicalSkill) &&
    recordArray(publicContribution?.positiveSignals).filter((item) => filledText(item.agent) && filledText(item.evidence))
      .length >= 5 &&
    recordArray(publicContribution?.externalPullUses).filter((item) => filledText(item.agent) && filledText(item.evidence))
      .length >= 3;

  const publishedArtifacts = asRecord(manifest.publishedArtifacts);
  const curationStats = asRecord(manifest.curationStats);
  const publishedReady =
    filledText(publishedArtifacts?.antiPattern) &&
    filledText(publishedArtifacts?.trace) &&
    filledText(publishedArtifacts?.run) &&
    asRecord(publishedArtifacts?.tracePlanRead) !== undefined &&
    asRecord(publishedArtifacts?.runPlanRead) !== undefined &&
    filledText(curationStats?.featuredPick) &&
    filledText(curationStats?.featuredAntiPattern) &&
    filledText(curationStats?.stats) &&
    (numberValue(curationStats?.top5SkillSharePercent) ?? 0) >= 30;

  const twoWeekImprovement = asRecord(manifest.twoWeekImprovement);
  const twoWeekReady =
    filledText(twoWeekImprovement?.followupDate) &&
    (numberValue(twoWeekImprovement?.baselineMetric) ?? 0) > 0 &&
    (numberValue(twoWeekImprovement?.followupMetric) ?? 0) > 0 &&
    (numberValue(twoWeekImprovement?.improvementPercent) ?? 0) > 0 &&
    filledText(twoWeekImprovement?.contributorProfile) &&
    filledText(twoWeekImprovement?.contributorAgent) &&
    filledText(twoWeekImprovement?.competingDiscussion) &&
    stringArray(twoWeekImprovement?.competingSkillReferences).filter(filledText).length >= 2 &&
    filledText(twoWeekImprovement?.similarGoalsEvidence) &&
    recordArray(twoWeekImprovement?.refinementEvidence).filter((item) => filledText(item.agent) && filledText(item.evidence))
      .length >= 2;

  return [
    proofCheck("Starter pack", starterReady, "starter skills/traces plus first-run evidence", [
      "starterPack",
    ]),
    proofCheck("Real coding goals", realGoals.length >= 5 && realGoalEvidenceCount >= 5, `${realGoals.length}/5 goals recorded`, [
      "realGoals",
    ]),
    proofCheck(
      "Provider and credential smokes",
      providerSmokeCount === 3 && internalCredentialSmoke,
      `provider smokes ${providerSmokeCount}/3, internal credential smoke ${internalCredentialSmoke ? "present" : "missing"}`,
      ["providerSmokes", "internalCredentialSmoke"],
    ),
    proofCheck("Behavior loop", behaviorReady, "world subscriptions and behavior-loop evidence", [
      "worldSubscriptions",
      "behaviorLoop",
    ]),
    proofCheck("Dream artifacts", dreamReady, "Dream candidates, private/public skill split, anti-pattern, and trace", [
      "dreamArtifacts",
    ]),
    proofCheck("Public contribution", publicReady, "public PR, math gate, positive signals, and pull/use evidence", [
      "publicContribution",
    ]),
    proofCheck("Published artifacts and curation", publishedReady, "published world artifacts plus featured stats", [
      "publishedArtifacts",
      "curationStats",
    ]),
    proofCheck("Two-week improvement", twoWeekReady, "follow-up metrics, competing variants, and refinements", [
      "twoWeekImprovement",
    ]),
  ];
}

function evidencePath(env: Readonly<Record<string, string | undefined>> | undefined): string | undefined {
  const value = env?.VIVARIUM_V1_EVIDENCE_PATH?.trim();
  return value === undefined || value.length === 0 || isPlaceholder(value) ? undefined : value;
}

function manifestStatusAndChecks(options: ProofCommandOptions): {
  readonly manifestStatus: ProofManifestStatus;
  readonly checks: readonly ProofCheck[];
} {
  const path = evidencePath(options.env);
  if (path === undefined) {
    return { manifestStatus: { kind: "not_configured" }, checks: emptyChecks() };
  }

  const pathExists = options.pathExists ?? existsSync;
  if (!pathExists(path)) {
    return { manifestStatus: { kind: "missing", path }, checks: emptyChecks() };
  }

  try {
    const body = (options.readFile ?? ((filePath: string) => readFileSync(filePath, "utf8")))(path);
    const manifest = asRecord(JSON.parse(body));
    if (manifest === undefined) {
      return {
        manifestStatus: { kind: "invalid", path, error: "Evidence manifest must be a JSON object." },
        checks: emptyChecks(),
      };
    }
    return { manifestStatus: { kind: "loaded", path }, checks: summarizeManifest(manifest) };
  } catch (error) {
    return {
      manifestStatus: { kind: "invalid", path, error: error instanceof Error ? error.message : String(error) },
      checks: emptyChecks(),
    };
  }
}

function nextCommandsFor(
  envFilePath: string,
  manifestStatus: ProofManifestStatus,
  checks: readonly ProofCheck[],
  showDetails: boolean,
): readonly string[] {
  const envFile = shellQuote(envFilePath);
  const initCommand = connectInitOrOnboardCommandLine(envFilePath);
  const signupCommand = "vivarium connect signup";
  const fillCommand =
    isDefaultLiveEnvFile(envFilePath)
      ? "vivarium connect fill"
      : `vivarium connect fill --env-file ${envFile}`;
  const setupCommand =
    isDefaultLiveEnvFile(envFilePath)
      ? "vivarium connect setup --confirm-write"
      : `vivarium connect setup --env-file ${envFile} --confirm-write`;
  const smokeCommand =
    isDefaultLiveEnvFile(envFilePath)
      ? "vivarium connect smoke"
      : `vivarium connect smoke --env-file ${envFile}`;
  const proofCommand =
    isDefaultLiveEnvFile(envFilePath)
      ? "vivarium proof"
      : `vivarium proof --env-file ${envFile}`;
  const proofDetailsCommand =
    isDefaultLiveEnvFile(envFilePath)
      ? "vivarium proof --details"
      : `vivarium proof --env-file ${envFile} --details`;
  const proofInitCommand =
    isDefaultLiveEnvFile(envFilePath)
      ? "vivarium proof init"
      : `vivarium proof init --env-file ${envFile}`;
  const connectCommand =
    isDefaultLiveEnvFile(envFilePath)
      ? "vivarium connect"
      : `vivarium connect --env-file ${envFile}`;
  const doctorCommand =
    isDefaultLiveEnvFile(envFilePath)
      ? "vivarium doctor --live"
      : `vivarium doctor --live --env-file ${envFile}`;
  const needsSmokeSetup = checks.some((check) => check.label === "Provider and credential smokes" && !check.ok);
  const hasBlockedEvidence = checks.some((check) => !check.ok);
  const needsDefaultSetupFiles = needsSmokeSetup && isDefaultLiveEnvFile(envFilePath);
  const proofReviewCommand =
    manifestStatus.kind === "loaded" && hasBlockedEvidence && !showDetails
      ? proofDetailsCommand
      : proofCommand;
  return [
    ...(manifestStatus.kind === "not_configured" || needsDefaultSetupFiles ? [initCommand] : []),
    connectCommand,
    ...(needsSmokeSetup ? [signupCommand, fillCommand, setupCommand] : []),
    ...(manifestStatus.kind === "loaded"
      ? []
      : manifestStatus.kind === "missing"
        ? [proofInitCommand]
        : manifestStatus.kind === "not_configured"
          ? [proofInitCommand]
        : needsSmokeSetup ? [] : [setupCommand]),
    smokeCommand,
    proofReviewCommand,
    doctorCommand,
  ];
}

function isDefaultLiveEnvFile(envFilePath: string): boolean {
  return (
    envFilePath === "live-readiness.local.env" ||
    envFilePath.endsWith("/.vivarium/live/live-readiness.local.env")
  );
}

function proofCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium proof"
    : `vivarium proof --env-file ${shellQuote(envFilePath)}`;
}

function doctorCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium doctor --live"
    : `vivarium doctor --live --env-file ${shellQuote(envFilePath)}`;
}

function proofInitCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium proof init"
    : `vivarium proof init --env-file ${shellQuote(envFilePath)}`;
}

function connectInitCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium connect init"
    : `vivarium connect init --path ${shellQuote(envFilePath)}`;
}

function connectInitOrOnboardCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium setup live"
    : connectInitCommandLine(envFilePath);
}

function connectCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium connect"
    : `vivarium connect --env-file ${shellQuote(envFilePath)}`;
}

function proofInitNextCommands(
  envFilePath: string,
  result: LiveEvidenceInitCommandResult | undefined,
): readonly string[] {
  if (result?.ok === true || result?.error.includes("already exists") === true) {
    return [proofCommandLine(envFilePath), doctorCommandLine(envFilePath)];
  }

  return [
    connectInitOrOnboardCommandLine(envFilePath),
    connectCommandLine(envFilePath),
    proofInitCommandLine(envFilePath),
  ];
}

export function proofInitCommand(options: ProofInitCommandOptions = {}): ProofInitCommandResult {
  const envFilePath = options.envFilePath ?? "live-readiness.local.env";
  if (options.env === undefined) {
    return {
      ok: false,
      written: false,
      envFilePath,
      showDetails: options.showDetails === true,
      error: "Setup file is missing or unreadable.",
      nextCommands: proofInitNextCommands(envFilePath, undefined),
    };
  }

  const path = evidencePath(options.env);
  if (path === undefined) {
    return {
      ok: false,
      written: false,
      envFilePath,
      showDetails: options.showDetails === true,
      error: "Evidence manifest path is not configured yet.",
      nextCommands: proofInitNextCommands(envFilePath, undefined),
    };
  }

  const result = liveEvidenceInitCommand({ path, overwrite: options.overwrite === true });
  return {
    ok: result.ok,
    written: result.written,
    envFilePath,
    showDetails: options.showDetails === true,
    path: result.path,
    ...(result.ok ? { sections: result.sections } : {}),
    ...(result.ok ? {} : { error: result.error }),
    nextCommands: proofInitNextCommands(envFilePath, result),
  };
}

export function proofCommand(options: ProofCommandOptions = {}): ProofCommandResult {
  const envFilePath = options.envFilePath ?? "live-readiness.local.env";
  const { manifestStatus, checks } = manifestStatusAndChecks(options);
  const strictChecks = applyDoctorStrictness(checks, { ...options, envFilePath });
  return {
    ok: manifestStatus.kind === "loaded" && strictChecks.every((check) => check.ok),
    showDetails: options.showDetails === true,
    envFilePath,
    manifestStatus,
    checks: strictChecks,
    nextCommands: nextCommandsFor(envFilePath, manifestStatus, strictChecks, options.showDetails === true),
  };
}

function renderManifestStatus(status: ProofManifestStatus): string {
  if (status.kind === "not_configured") {
    return "Evidence manifest: not configured yet";
  }
  if (status.kind === "missing") {
    return `Evidence manifest: missing at ${status.path}`;
  }
  if (status.kind === "invalid") {
    return `Evidence manifest: invalid at ${status.path}`;
  }
  return `Evidence manifest: ${status.path}`;
}

function renderCheck(check: ProofCheck): string {
  return `  [${check.ok ? "ready" : "needs"}] ${check.label}: ${check.detail}`;
}

export function renderProofCommandResult(result: ProofCommandResult): string {
  const passing = result.checks.filter((check) => check.ok).length;
  const blocked = result.checks.length - passing;
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Proof",
    "--------------",
    `Status: ${result.ok ? "ready" : "blocked"}`,
    `Setup file: ${result.envFilePath}`,
    renderManifestStatus(result.manifestStatus),
    `Checks: ${passing} passing, ${blocked} blocked`,
    "",
    "Proof checklist",
    ...result.checks.map(renderCheck),
    ...(result.manifestStatus.kind === "invalid" ? ["", `Error: ${result.manifestStatus.error}`] : []),
    ...(result.showDetails
      ? [
          "",
          "Exact evidence setup:",
          `  VIVARIUM_V1_EVIDENCE_PATH: ${result.manifestStatus.kind === "not_configured" ? "missing" : "set"}`,
          "Manifest sections:",
          ...result.checks.flatMap((check) => check.sectionKeys.map((key) => `  ${check.label}: ${key}`)),
        ]
      : [
          "",
          "Details:",
          "  Re-run with --details to show exact evidence manifest section keys.",
        ]),
    "",
    "Next commands:",
    ...renderLaunchSequence(result.nextCommands),
    "",
  ].join("\n");
}

export function renderProofInitCommandResult(result: ProofInitCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Proof Init",
    "-------------------",
    `Status: ${result.ok ? "written" : "blocked"}`,
    `Setup file: ${result.envFilePath}`,
    ...(result.path === undefined ? [] : [`Evidence manifest: ${result.path}`]),
    ...(result.ok
      ? [`Sections: ${result.sections?.length ?? 0}`]
      : [`Reason: ${result.error ?? "Evidence manifest was not created."}`]),
    ...(result.showDetails
      ? [
          "",
          "Exact evidence setup:",
          `  VIVARIUM_V1_EVIDENCE_PATH: ${result.path === undefined ? "missing" : "set"}`,
        ]
      : []),
    "",
    "Next commands:",
    ...renderLaunchSequence(result.nextCommands),
    "",
  ].join("\n");
}
