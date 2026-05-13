import { renderVivariumGlobe } from "./branding.js";

export interface StatusSummary {
  readonly repo: string;
  readonly runtime: "offline-local";
}

export function statusCommand(): StatusSummary {
  return { repo: "the-agent", runtime: "offline-local" };
}

export function renderStatusCommandResult(result: StatusSummary): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Status",
    "---------------",
    `Repository: ${result.repo}`,
    `Runtime: ${result.runtime}`,
    "",
    "Next commands:",
    "  vivarium setup    Initialize local state and guided live setup.",
    "  vivarium doctor   Check readiness.",
    "  vivarium help     Show the command guide.",
    "",
  ].join("\n");
}
