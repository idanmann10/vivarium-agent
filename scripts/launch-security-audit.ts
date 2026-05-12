type FeatureStatus = "enabled" | "disabled" | "unavailable" | "unknown";
type AlertCount = number | "unavailable" | "unknown";
type BranchProtectionStatus = "enabled" | "missing" | "unavailable";

export interface RepositorySecurityEvidence {
  readonly name: string;
  readonly private: boolean;
  readonly visibility: string;
  readonly hasIssues: boolean;
  readonly hasDiscussions: boolean;
  readonly allowAutoMerge: boolean;
  readonly deleteBranchOnMerge: boolean;
  readonly dependabotSecurityUpdates: FeatureStatus;
  readonly privateVulnerabilityReporting: FeatureStatus;
  readonly secretScanning: FeatureStatus;
  readonly pushProtection: FeatureStatus;
  readonly dependabotAlerts: AlertCount;
  readonly secretScanningAlerts: AlertCount;
  readonly codeScanningAlerts: AlertCount;
  readonly branchProtection: BranchProtectionStatus;
  readonly rulesets: number | "unavailable";
}

export interface LaunchSecurityEvidence {
  readonly agent: RepositorySecurityEvidence;
  readonly world: RepositorySecurityEvidence;
}

export interface LaunchSecurityAudit {
  readonly ok: boolean;
  readonly blockers: readonly string[];
  readonly manualDecisions: readonly string[];
}

interface GhApiOk {
  readonly ok: true;
  readonly data: unknown;
}

interface GhApiError {
  readonly ok: false;
  readonly statusCode?: number;
  readonly message: string;
}

type GhApiResult = GhApiOk | GhApiError;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function booleanField(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function featureStatus(value: unknown): FeatureStatus {
  if (!isRecord(value)) {
    return "unknown";
  }

  const status = stringField(value, "status");
  return status === "enabled" || status === "disabled" ? status : "unknown";
}

function nestedRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

export function securityFeatureStatusFromMetadata(
  record: Record<string, unknown>,
  key: string,
): FeatureStatus {
  if (record.security_and_analysis === null || record.security_and_analysis === undefined) {
    return "unavailable";
  }

  const security = nestedRecord(record, "security_and_analysis");
  return security === undefined ? "unknown" : featureStatus(security[key]);
}

function countFromApi(result: GhApiResult): AlertCount {
  if (!result.ok) {
    return "unavailable";
  }

  return Array.isArray(result.data) ? result.data.length : "unknown";
}

function privateVulnerabilityReportingStatus(result: GhApiResult): FeatureStatus {
  if (!result.ok) {
    return "unavailable";
  }

  if (!isRecord(result.data)) {
    return "unknown";
  }

  return result.data.enabled === true ? "enabled" : "disabled";
}

function branchProtectionStatus(result: GhApiResult): BranchProtectionStatus {
  if (result.ok) {
    return "enabled";
  }

  return result.statusCode === 404 ? "missing" : "unavailable";
}

function rulesetCount(result: GhApiResult): number | "unavailable" {
  if (!result.ok) {
    return "unavailable";
  }

  return Array.isArray(result.data) ? result.data.length : "unavailable";
}

export function parseGitHubErrorStatusCode(text: string): number | undefined {
  const jsonStatus = text.match(/"status"\s*:\s*"?(?<status>\d{3})"?/);
  if (jsonStatus?.groups?.status !== undefined) {
    return Number(jsonStatus.groups.status);
  }

  const parentheticalStatus = text.match(/\(HTTP (?<status>\d{3})\)/);
  if (parentheticalStatus?.groups?.status !== undefined) {
    return Number(parentheticalStatus.groups.status);
  }

  const httpStatus = text.match(/HTTP\/[0-9.]+\s+(?<status>\d{3})/);
  return httpStatus?.groups?.status === undefined ? undefined : Number(httpStatus.groups.status);
}

function ghApi(endpoint: string): GhApiResult {
  const result = Bun.spawnSync(["gh", "api", endpoint], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);

  if (result.exitCode !== 0) {
    const statusCode = parseGitHubErrorStatusCode(stderr);
    return {
      ok: false,
      ...(statusCode === undefined ? {} : { statusCode }),
      message: stderr.trim(),
    };
  }

  try {
    return { ok: true, data: JSON.parse(stdout) as unknown };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "failed to parse gh api output",
    };
  }
}

function repoEvidence(owner: string, repo: string): RepositorySecurityEvidence {
  const metadata = ghApi(`repos/${owner}/${repo}`);
  if (!metadata.ok) {
    throw new Error(`Unable to read repository metadata for ${owner}/${repo}: ${metadata.message}`);
  }
  if (!isRecord(metadata.data)) {
    throw new Error(`Unable to read repository metadata for ${owner}/${repo}: invalid JSON shape`);
  }

  const branchProtection = ghApi(`repos/${owner}/${repo}/branches/main/protection`);
  const privateVulnerabilityReporting = ghApi(
    `repos/${owner}/${repo}/private-vulnerability-reporting`,
  );
  const dependabotAlerts = ghApi(`repos/${owner}/${repo}/dependabot/alerts?state=open`);
  const secretScanningAlerts = ghApi(`repos/${owner}/${repo}/secret-scanning/alerts?state=open`);
  const codeScanningAlerts = ghApi(`repos/${owner}/${repo}/code-scanning/alerts?state=open`);
  const rulesets = ghApi(`repos/${owner}/${repo}/rulesets`);

  return {
    name: repo,
    private: booleanField(metadata.data, "private"),
    visibility: stringField(metadata.data, "visibility") ?? "unknown",
    hasIssues: booleanField(metadata.data, "has_issues"),
    hasDiscussions: booleanField(metadata.data, "has_discussions"),
    allowAutoMerge: booleanField(metadata.data, "allow_auto_merge"),
    deleteBranchOnMerge: booleanField(metadata.data, "delete_branch_on_merge"),
    dependabotSecurityUpdates: securityFeatureStatusFromMetadata(
      metadata.data,
      "dependabot_security_updates",
    ),
    privateVulnerabilityReporting: privateVulnerabilityReportingStatus(
      privateVulnerabilityReporting,
    ),
    secretScanning: securityFeatureStatusFromMetadata(metadata.data, "secret_scanning"),
    pushProtection: securityFeatureStatusFromMetadata(
      metadata.data,
      "secret_scanning_push_protection",
    ),
    dependabotAlerts: countFromApi(dependabotAlerts),
    secretScanningAlerts: countFromApi(secretScanningAlerts),
    codeScanningAlerts: countFromApi(codeScanningAlerts),
    branchProtection: branchProtectionStatus(branchProtection),
    rulesets: rulesetCount(rulesets),
  };
}

function pushStatusBlocker(
  blockers: string[],
  repo: RepositorySecurityEvidence,
  key: keyof Pick<
    RepositorySecurityEvidence,
    | "dependabotSecurityUpdates"
    | "privateVulnerabilityReporting"
    | "secretScanning"
    | "pushProtection"
  >,
): void {
  if (repo[key] !== "enabled") {
    blockers.push(`${repo.name}.${key}:${repo[key]}`);
  }
}

function pushAlertBlocker(
  blockers: string[],
  repo: RepositorySecurityEvidence,
  key: keyof Pick<
    RepositorySecurityEvidence,
    "dependabotAlerts" | "secretScanningAlerts" | "codeScanningAlerts"
  >,
): void {
  const value = repo[key];
  if (value !== 0) {
    blockers.push(`${repo.name}.${key}:${value}`);
  }
}

function analyzeRepository(
  repo: RepositorySecurityEvidence,
): Pick<LaunchSecurityAudit, "blockers" | "manualDecisions"> {
  const blockers: string[] = [];
  const manualDecisions: string[] = [];

  if (repo.private || repo.visibility !== "public") {
    blockers.push(`${repo.name}.visibility:${repo.visibility}`);
  }

  if (!repo.hasIssues) {
    blockers.push(`${repo.name}.issues:disabled`);
  }

  if (!repo.hasDiscussions) {
    blockers.push(`${repo.name}.discussions:disabled`);
  }

  if (!repo.allowAutoMerge) {
    blockers.push(`${repo.name}.autoMerge:disabled`);
  }

  if (!repo.deleteBranchOnMerge) {
    blockers.push(`${repo.name}.deleteBranchOnMerge:disabled`);
  }

  pushStatusBlocker(blockers, repo, "dependabotSecurityUpdates");
  pushStatusBlocker(blockers, repo, "privateVulnerabilityReporting");
  pushStatusBlocker(blockers, repo, "secretScanning");
  pushStatusBlocker(blockers, repo, "pushProtection");
  pushAlertBlocker(blockers, repo, "dependabotAlerts");
  pushAlertBlocker(blockers, repo, "secretScanningAlerts");
  pushAlertBlocker(blockers, repo, "codeScanningAlerts");

  if (repo.branchProtection !== "enabled" && repo.rulesets === 0) {
    manualDecisions.push(`${repo.name}.branchProtectionOrRulesets:decision-required`);
  }

  return { blockers, manualDecisions };
}

export function analyzeLaunchSecurity(evidence: LaunchSecurityEvidence): LaunchSecurityAudit {
  const agent = analyzeRepository(evidence.agent);
  const world = analyzeRepository(evidence.world);
  const blockers = [...agent.blockers, ...world.blockers];
  const manualDecisions = [...agent.manualDecisions, ...world.manualDecisions];

  return {
    ok: blockers.length === 0 && manualDecisions.length === 0,
    blockers,
    manualDecisions,
  };
}

if (import.meta.main) {
  const owner = process.env.GITHUB_REPOSITORY_OWNER ?? "idanmann10";
  const agentRepo = process.env.VIVARIUM_AGENT_REPO_NAME ?? "vivarium-agent";
  const worldRepo = process.env.VIVARIUM_WORLD_REPO_NAME ?? "vivarium-world";
  const evidence = {
    agent: repoEvidence(owner, agentRepo),
    world: repoEvidence(owner, worldRepo),
  };
  const audit = analyzeLaunchSecurity(evidence);

  console.log(JSON.stringify({ ...audit, evidence }, null, 2));

  if (!audit.ok) {
    process.exit(1);
  }
}
