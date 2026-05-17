import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderVivariumGlobe } from "./branding.js";
import { addCredentialCommand } from "./credentials.js";
import { renderLaunchSequence } from "./launch-sequence.js";
import { configureProviderProfileCommand } from "./providers.js";

export interface LiveSetupCommandOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly confirmWrite: boolean;
}

export type LiveSetupCommandResult =
  | {
      readonly ok: true;
      readonly written: true;
      readonly providerProfiles: readonly string[];
      readonly credentialName: string;
      readonly paths: {
        readonly providerProfilesPath: string;
        readonly credentialsPath: string;
        readonly evidenceManifestPath?: string;
      };
    }
  | {
      readonly ok: false;
      readonly written: false;
      readonly requiresConfirmation?: true;
      readonly wouldWrite?: readonly string[];
      readonly providerProfiles?: readonly string[];
      readonly credentialName?: string;
      readonly paths?: {
        readonly providerProfilesPath: string;
        readonly credentialsPath: string;
        readonly evidenceManifestPath?: string;
      };
      readonly missing?: readonly string[];
      readonly placeholders?: readonly string[];
      readonly invalid?: readonly string[];
    };

export interface LiveEvidenceInitCommandOptions {
  readonly path: string;
  readonly overwrite?: boolean;
}

export interface LiveEnvInitCommandOptions {
  readonly path: string;
  readonly overwrite?: boolean;
  readonly templatePath?: string;
  readonly prefill?: LiveEnvPrefillOptions;
}

export interface LiveEnvPrefillOptions {
  readonly githubOwner?: string;
  readonly agentRepo?: string;
  readonly worldRepo?: string;
  readonly canonicalWorldRef?: string;
  readonly privateWorldRef?: string;
}

export type LiveEnvInitCommandResult =
  | {
      readonly ok: true;
      readonly written: true;
      readonly path: string;
      readonly mode: "0600";
      readonly templatePath: string;
      readonly prefilled: readonly string[];
    }
  | {
      readonly ok: false;
      readonly written: false;
      readonly path: string;
      readonly error: string;
    };

export type LiveEvidenceInitCommandResult =
  | {
      readonly ok: true;
      readonly written: true;
      readonly path: string;
      readonly sections: readonly string[];
    }
  | {
      readonly ok: false;
      readonly written: false;
      readonly path: string;
      readonly error: string;
    };

const requiredEnvNames = [
  "VIVARIUM_PROVIDER_PROFILES_PATH",
  "ANTHROPIC_API_KEY",
  "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE",
  "VIVARIUM_ANTHROPIC_MODEL",
  "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW",
  "OPENROUTER_API_KEY",
  "VIVARIUM_OPENROUTER_PROVIDER_PROFILE",
  "VIVARIUM_OPENROUTER_MODEL",
  "VIVARIUM_OPENROUTER_BASE_URL",
  "VIVARIUM_OPENROUTER_CONTEXT_WINDOW",
  "VIVARIUM_OAI_COMPAT_API_KEY",
  "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE",
  "VIVARIUM_OAI_COMPAT_MODEL",
  "VIVARIUM_OAI_COMPAT_BASE_URL",
  "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW",
  "VIVARIUM_CREDENTIALS_PATH",
  "VIVARIUM_CREDENTIALS_MASTER_KEY",
  "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME",
  "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
  "VIVARIUM_INTERNAL_API_HEALTH_URL",
] as const;

const integerEnvNames = [
  "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW",
  "VIVARIUM_OPENROUTER_CONTEXT_WINDOW",
  "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW",
] as const;

const httpUrlEnvNames = [
  "VIVARIUM_OPENROUTER_BASE_URL",
  "VIVARIUM_OAI_COMPAT_BASE_URL",
  "VIVARIUM_INTERNAL_API_HEALTH_URL",
] as const;

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function isDefaultLiveEnvFile(envFilePath: string): boolean {
  return (
    envFilePath === "live-readiness.local.env" ||
    envFilePath.endsWith("/.vivarium/live/live-readiness.local.env")
  );
}

function connectCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium connect"
    : `vivarium connect --env-file ${envFilePath}`;
}

function connectSetupCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium connect setup"
    : `vivarium connect setup --env-file ${envFilePath}`;
}

function connectSmokeCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium connect smoke"
    : `vivarium connect smoke --env-file ${envFilePath}`;
}

function proofCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium proof"
    : `vivarium proof --env-file ${envFilePath}`;
}

function modelCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium model"
    : `vivarium model --env-file ${envFilePath}`;
}

function doctorLiveCommandLine(envFilePath: string): string {
  return isDefaultLiveEnvFile(envFilePath)
    ? "vivarium doctor --live"
    : `vivarium doctor --live --env-file ${envFilePath}`;
}

type RequiredEnvName = (typeof requiredEnvNames)[number];
type IntegerEnvName = (typeof integerEnvNames)[number];
type HttpUrlEnvName = (typeof httpUrlEnvNames)[number];

const v1EvidenceSections = [
  "starterPack",
  "realGoals",
  "providerSmokes",
  "internalCredentialSmoke",
  "worldSubscriptions",
  "behaviorLoop",
  "dreamArtifacts",
  "publicContribution",
  "publishedArtifacts",
  "curationStats",
  "twoWeekImprovement",
] as const;

const defaultLiveEnvTemplatePath = "docs/live-readiness.env.example";
const repoLiveEnvTemplatePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/live-readiness.env.example",
);

const liveEnvPrefillMap = {
  githubOwner: "VIVARIUM_GITHUB_OWNER",
  agentRepo: "VIVARIUM_AGENT_REPO_NAME",
  worldRepo: "VIVARIUM_WORLD_REPO_NAME",
  canonicalWorldRef: "VIVARIUM_CANONICAL_WORLD_REF",
  privateWorldRef: "VIVARIUM_PRIVATE_WORLD_REF",
} as const;

type LiveEnvPrefillKey = keyof typeof liveEnvPrefillMap;

function shellEnvLiteral(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function applyLiveEnvPrefill(
  template: string,
  prefill: LiveEnvPrefillOptions | undefined,
): { readonly body: string; readonly prefilled: readonly string[] } {
  let body = template;
  const prefilled: string[] = [];

  for (const key of Object.keys(liveEnvPrefillMap) as LiveEnvPrefillKey[]) {
    const value = prefill?.[key]?.trim();
    if (value === undefined || value.length === 0) {
      continue;
    }

    const envName = liveEnvPrefillMap[key];
    body = body.replace(
      new RegExp(`^export ${envName}=.*$`, "m"),
      `export ${envName}=${shellEnvLiteral(value)}`,
    );
    prefilled.push(envName);
  }

  return { body, prefilled };
}

function v1EvidenceSkeleton(): Readonly<Record<string, unknown>> {
  return {
    starterPack: {
      primaryDomain: "coding",
      skillCount: 0,
      traceCount: 0,
      skillReferences: [],
      traceReferences: [],
      curriculum: "",
      firstRunReferences: [],
    },
    realGoals: [],
    providerSmokes: {
      anthropic: "",
      openRouter: "",
      privateOaiCompat: "",
    },
    internalCredentialSmoke: "",
    worldSubscriptions: {
      canonical: "",
      privateFork: "",
    },
    behaviorLoop: {
      antiPatternAvoided: "",
      antiPatternUnfamiliarTerritory: "",
      tracesRead: [],
      traceSimilarWorkflows: "",
      monitorFailurePattern: "",
      recoverReplan: "",
      destructiveHold: "",
      destructiveEscalation: "",
      destructiveConfirmation: "",
      destructiveContinuation: "",
      destructiveEndpoint: {
        run: "",
        sequence: [],
      },
      refusal: "",
    },
    dreamArtifacts: {
      skillCandidates: [],
      internalSkill: "",
      internalSkillPrivateFork: "",
      internalSkillCanonicalAbsence: "",
      publicSkill: "",
      antiPattern: "",
      trace: "",
      traceSourceRun: "",
      traceAnnotations: "",
    },
    publicContribution: {
      contributorAgent: "",
      publicSkillPr: "",
      mathGate: "",
      autoMerge: "",
      canonicalSkill: "",
      contributorTrust: 0,
      positiveSignals: [],
      externalPullUses: [],
    },
    publishedArtifacts: {
      contributorAgent: "",
      antiPattern: "",
      trace: "",
      run: "",
      tracePlanRead: {
        agent: "",
        evidence: "",
      },
      runPlanRead: {
        agent: "",
        evidence: "",
      },
    },
    curationStats: {
      agentContributor: "",
      featuredContributor: "",
      featuredPick: "",
      featuredAntiPattern: "",
      stats: "",
      top5SkillSharePercent: 0,
    },
    twoWeekImprovement: {
      followupDate: "",
      baselineMetric: 0,
      followupMetric: 0,
      improvementPercent: 0,
      contributorProfile: "",
      contributorAgent: "",
      competingDiscussion: "",
      competingSkillReferences: [],
      similarGoalsEvidence: "",
      refinementEvidence: [],
      contributorProfileSummary: {
        publicSkills: 0,
        antiPatterns: 0,
        traces: 0,
        publishedRuns: 0,
        internalSkills: 0,
        publicTrust: 0,
      },
    },
  };
}

function isPlaceholderValue(value: string): boolean {
  return /^<[^>]+>$/.test(value.trim());
}

function textEnv(env: Readonly<Record<string, string | undefined>>, name: RequiredEnvName): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

function integerEnv(env: Readonly<Record<string, string | undefined>>, name: IntegerEnvName): number | undefined {
  const value = textEnv(env, name);
  if (value === undefined || isPlaceholderValue(value)) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function httpUrlEnv(env: Readonly<Record<string, string | undefined>>, name: HttpUrlEnvName): string | undefined {
  const value = textEnv(env, name);
  if (value === undefined || isPlaceholderValue(value)) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function isFilledNonPlaceholderEnv(env: Readonly<Record<string, string | undefined>>, name: RequiredEnvName): boolean {
  const value = textEnv(env, name);
  return value !== undefined && !isPlaceholderValue(value);
}

function validateLiveSetupEnv(env: Readonly<Record<string, string | undefined>>): LiveSetupCommandResult | undefined {
  const missing = requiredEnvNames.filter((name) => textEnv(env, name) === undefined);
  const placeholders = requiredEnvNames.filter((name) => {
    const value = textEnv(env, name);
    return value !== undefined && isPlaceholderValue(value);
  });
  const invalid = [
    ...integerEnvNames.filter((name) => isFilledNonPlaceholderEnv(env, name) && integerEnv(env, name) === undefined),
    ...httpUrlEnvNames.filter((name) => isFilledNonPlaceholderEnv(env, name) && httpUrlEnv(env, name) === undefined),
  ];

  if (missing.length > 0 || placeholders.length > 0 || invalid.length > 0) {
    return {
      ok: false,
      written: false,
      ...(missing.length === 0 ? {} : { missing }),
      ...(placeholders.length === 0 ? {} : { placeholders }),
      ...(invalid.length === 0 ? {} : { invalid }),
    };
  }

  return undefined;
}

function required(env: Readonly<Record<string, string | undefined>>, name: RequiredEnvName): string {
  const value = textEnv(env, name);
  if (value === undefined || isPlaceholderValue(value)) {
    throw new Error(`Missing required live setup env: ${name}`);
  }
  return value;
}

function optionalFilledEnv(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value.length === 0 || isPlaceholderValue(value) ? undefined : value;
}

export function liveSetupCommand(options: LiveSetupCommandOptions): LiveSetupCommandResult {
  const invalid = validateLiveSetupEnv(options.env);
  if (invalid !== undefined) {
    return invalid;
  }

  const providerProfilesPath = required(options.env, "VIVARIUM_PROVIDER_PROFILES_PATH");
  const anthropicProfile = required(options.env, "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE");
  const openRouterProfile = required(options.env, "VIVARIUM_OPENROUTER_PROVIDER_PROFILE");
  const privateProfile = required(options.env, "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE");
  const credentialsPath = required(options.env, "VIVARIUM_CREDENTIALS_PATH");
  const evidenceManifestPath = optionalFilledEnv(options.env, "VIVARIUM_V1_EVIDENCE_PATH");
  const credentialName = required(options.env, "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME");
  const providerProfiles = [anthropicProfile, openRouterProfile, privateProfile];
  const paths = {
    providerProfilesPath,
    credentialsPath,
    ...(evidenceManifestPath === undefined ? {} : { evidenceManifestPath }),
  };

  if (!options.confirmWrite) {
    return {
      ok: false,
      written: false,
      requiresConfirmation: true,
      wouldWrite: [
        "providerProfiles",
        "credential",
        ...(evidenceManifestPath === undefined ? [] : ["evidenceManifest"]),
      ],
      providerProfiles,
      credentialName,
      paths,
    };
  }

  configureProviderProfileCommand({
    profilesPath: providerProfilesPath,
    name: anthropicProfile,
    kind: "anthropic",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    model: required(options.env, "VIVARIUM_ANTHROPIC_MODEL"),
    capabilities: ["chat", "tools"],
    contextWindow: integerEnv(options.env, "VIVARIUM_ANTHROPIC_CONTEXT_WINDOW") ?? 1,
    costClass: "expensive",
  });
  configureProviderProfileCommand({
    profilesPath: providerProfilesPath,
    name: openRouterProfile,
    kind: "openai-compat",
    apiKeyEnv: "OPENROUTER_API_KEY",
    model: required(options.env, "VIVARIUM_OPENROUTER_MODEL"),
    baseUrl: required(options.env, "VIVARIUM_OPENROUTER_BASE_URL"),
    capabilities: ["chat", "json_mode"],
    contextWindow: integerEnv(options.env, "VIVARIUM_OPENROUTER_CONTEXT_WINDOW") ?? 1,
    costClass: "medium",
  });
  configureProviderProfileCommand({
    profilesPath: providerProfilesPath,
    name: privateProfile,
    kind: "openai-compat",
    apiKeyEnv: "VIVARIUM_OAI_COMPAT_API_KEY",
    model: required(options.env, "VIVARIUM_OAI_COMPAT_MODEL"),
    baseUrl: required(options.env, "VIVARIUM_OAI_COMPAT_BASE_URL"),
    capabilities: ["chat", "json_mode"],
    contextWindow: integerEnv(options.env, "VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW") ?? 1,
    costClass: "medium",
  });
  addCredentialCommand({
    credentialsPath,
    masterKey: required(options.env, "VIVARIUM_CREDENTIALS_MASTER_KEY"),
    kind: "bearer",
    name: credentialName,
    purpose: "Call internal API",
    value: required(options.env, "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE"),
  });
  if (evidenceManifestPath !== undefined && !existsSync(evidenceManifestPath)) {
    liveEvidenceInitCommand({ path: evidenceManifestPath });
  }

  return {
    ok: true,
    written: true,
    providerProfiles,
    credentialName,
    paths,
  };
}

export function liveEnvInitCommand(options: LiveEnvInitCommandOptions): LiveEnvInitCommandResult {
  const templatePath =
    options.templatePath ?? (existsSync(defaultLiveEnvTemplatePath) ? defaultLiveEnvTemplatePath : repoLiveEnvTemplatePath);
  const { body, prefilled } = applyLiveEnvPrefill(
    readFileSync(templatePath, "utf8"),
    options.prefill,
  );
  mkdirSync(dirname(options.path), { recursive: true });

  try {
    writeFileSync(options.path, body, {
      encoding: "utf8",
      flag: options.overwrite === true ? "w" : "wx",
      mode: 0o600,
    });
    chmodSync(options.path, 0o600);
  } catch (error) {
    if (
      options.overwrite !== true &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { readonly code?: unknown }).code === "EEXIST"
    ) {
      return {
        ok: false,
        written: false,
        path: options.path,
        error: "Live readiness env already exists. Pass --overwrite to replace it.",
      };
    }
    throw error;
  }

  return {
    ok: true,
    written: true,
    path: options.path,
    mode: "0600",
    templatePath,
    prefilled,
  };
}

export function renderLiveEnvInitCommandResult(result: LiveEnvInitCommandResult): string {
  const envFilePath = shellQuote(result.path);
  const nextCommands = [
    connectCommandLine(envFilePath),
    connectSetupCommandLine(envFilePath),
    connectSmokeCommandLine(envFilePath),
    proofCommandLine(envFilePath),
    doctorLiveCommandLine(envFilePath),
  ];

  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Live Env",
    "-----------------",
    `Status: ${result.ok ? "written" : "blocked"}`,
    `Env file: ${result.path}`,
    ...(result.ok
      ? [
          `Template: ${result.templatePath}`,
          `Permissions: ${result.mode}`,
          ...(result.prefilled.length === 0
            ? []
            : [`Prefilled: ${result.prefilled.join(", ")}`]),
          "",
          "Next commands:",
          "  [1] Fill live settings",
          `      Edit ${result.path} locally. Keep it out of git.`,
          ...renderLaunchSequence(nextCommands, { startAt: 2 }),
        ]
      : [`Error: ${result.error}`]),
    "",
  ].join("\n");
}

export function renderLiveEvidenceInitCommandResult(result: LiveEvidenceInitCommandResult): string {
  const nextCommands = ["vivarium proof", "vivarium doctor --live"];

  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Live Evidence",
    "----------------------",
    `Status: ${result.ok ? "written" : "blocked"}`,
    `Evidence file: ${result.path}`,
    ...(result.ok
      ? [
          `Sections: ${result.sections.length}`,
          "",
          "Next commands:",
          "  [1] Fill evidence manifest",
          `      Add real artifact links to ${result.path}.`,
          ...renderLaunchSequence(nextCommands, { startAt: 2 }),
        ]
      : [`Error: ${result.error}`]),
    "",
  ].join("\n");
}

function renderList(label: string, values: readonly string[] | undefined): readonly string[] {
  return values === undefined || values.length === 0 ? [] : [label, ...values.map((value) => `  ${value}`)];
}

export function renderLiveSetupCommandResult(
  result: LiveSetupCommandResult,
  options: { readonly envFilePath?: string } = {},
): string {
  const status = result.ok ? "written" : result.requiresConfirmation === true ? "dry run" : "blocked";
  const envFilePath = shellQuote(options.envFilePath ?? "live-readiness.local.env");
  const postWriteCommands = [
    modelCommandLine(envFilePath),
    connectSmokeCommandLine(envFilePath),
    proofCommandLine(envFilePath),
    doctorLiveCommandLine(envFilePath),
  ];

  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Live Setup",
    "-------------------",
    `Status: ${status}`,
    ...(result.ok || result.requiresConfirmation === true
      ? [
          `Provider profiles: ${result.providerProfiles?.join(", ") ?? "none"}`,
          `Credential: ${result.credentialName ?? "none"}`,
          `Profiles path: ${result.paths?.providerProfilesPath ?? "not set"}`,
          `Credentials path: ${result.paths?.credentialsPath ?? "not set"}`,
          ...(result.paths?.evidenceManifestPath === undefined
            ? []
            : [`Evidence manifest: ${result.paths.evidenceManifestPath}`]),
        ]
      : [
          ...renderList("Missing:", result.missing),
          ...renderList("Placeholders:", result.placeholders),
          ...renderList("Invalid:", result.invalid),
        ]),
    "",
    ...(result.ok
      ? [
          "Next commands:",
          ...renderLaunchSequence(postWriteCommands),
        ]
      : result.requiresConfirmation === true
        ? [
            "Next commands:",
            "  [1] Confirm live writes",
            `      vivarium connect setup --env-file ${envFilePath} --confirm-write`,
          ]
        : [
            "Next commands:",
            "  [1] Fill live settings",
            `      Fill ${envFilePath}, then run ${connectCommandLine(envFilePath)}.`,
          ]),
    "",
  ].join("\n");
}

export function liveEvidenceInitCommand(options: LiveEvidenceInitCommandOptions): LiveEvidenceInitCommandResult {
  mkdirSync(dirname(options.path), { recursive: true });
  try {
    writeFileSync(options.path, `${JSON.stringify(v1EvidenceSkeleton(), null, 2)}\n`, {
      encoding: "utf8",
      flag: options.overwrite === true ? "w" : "wx",
      mode: 0o600,
    });
    chmodSync(options.path, 0o600);
  } catch (error) {
    if (
      options.overwrite !== true &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { readonly code?: unknown }).code === "EEXIST"
    ) {
      return {
        ok: false,
        written: false,
        path: options.path,
        error: "Evidence manifest already exists. Pass --overwrite to replace it.",
      };
    }
    throw error;
  }
  return {
    ok: true,
    written: true,
    path: options.path,
    sections: v1EvidenceSections,
  };
}
