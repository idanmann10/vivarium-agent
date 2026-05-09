export const runPublicationKind = "run";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface PublishRunRequest {
  readonly worldRoot: string;
  readonly runId: string;
  readonly domain: string;
  readonly goal: string;
  readonly outcome: string;
}

export function publishRun(request: PublishRunRequest): string {
  const directory = join(request.worldRoot, "runs", request.runId);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "RUN.md");
  writeFileSync(path, `# Goal\n\n${request.goal}\n\n# Outcome\n\n${request.outcome}\n`);
  writeFileSync(join(directory, "episodes.jsonl"), `${JSON.stringify({ kind: "run_end", success: true })}\n`);
  writeFileSync(join(directory, "meta.yaml"), `id: ${request.runId}\ndomain: ${request.domain}\nvisibility: public\n`);
  return path;
}
