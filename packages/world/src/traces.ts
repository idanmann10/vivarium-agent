export const tracePublicationKind = "trace";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface PublishTraceRequest {
  readonly worldRoot: string;
  readonly domain: string;
  readonly slug: string;
  readonly title: string;
  readonly steps: readonly string[];
}

export function publishTrace(request: PublishTraceRequest): string {
  const directory = join(request.worldRoot, "domains", request.domain, "traces", request.slug);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "TRACE.md");
  writeFileSync(
    path,
    `---\nid: ${request.domain}.${request.slug}\ntitle: ${request.title}\ndomain: ${request.domain}\n---\n\n# Goal\n\n${request.title}\n\n${request.steps.map((step, index) => `## Step ${index + 1}\n\n${step}`).join("\n\n")}\n`,
  );
  writeFileSync(
    join(directory, "steps.jsonl"),
    request.steps.map((step, index) => JSON.stringify({ index: index + 1, action: step })).join("\n") + "\n",
  );
  writeFileSync(join(directory, "meta.yaml"), `domain: ${request.domain}\nvisibility: public\n`);
  return path;
}
