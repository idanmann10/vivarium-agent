interface LaunchCommandStage {
  readonly label: string;
  readonly matches: (command: string) => boolean;
}

export interface RenderLaunchSequenceOptions {
  readonly heading?: string;
  readonly startAt?: number;
}

const launchCommandStages: readonly LaunchCommandStage[] = [
  {
    label: "Initialize local memory",
    matches: (command) =>
      command === "vivarium local" ||
      command === "vivarium onboard" ||
      (command.startsWith("vivarium setup") &&
        !command.startsWith("vivarium setup live") &&
        !command.includes("--env-file")),
  },
  {
    label: "Run the local agent",
    matches: (command) => command === "vivarium local run" || command.startsWith("vivarium local run ") || command.startsWith("vivarium run "),
  },
  {
    label: "Prepare live readiness",
    matches: (command) =>
      command.startsWith("vivarium live env-init ") ||
      command.startsWith("vivarium live setup ") ||
      command === "vivarium onboard live" ||
      command === "vivarium setup live" ||
      command.startsWith("vivarium setup live ") ||
      command === "vivarium connect" ||
      (command.startsWith("vivarium connect ") && !command.startsWith("vivarium connect smoke")) ||
      (command.startsWith("vivarium setup") && command.includes("--env-file")),
  },
  {
    label: "Load live settings",
    matches: (command) => command.startsWith("source "),
  },
  {
    label: "Inspect configured models",
    matches: (command) => command.startsWith("vivarium model"),
  },
  {
    label: "Run live smoke tests",
    matches: (command) =>
      command.startsWith("vivarium connect smoke") ||
      command.startsWith("vivarium providers smoke") ||
      command.startsWith("vivarium credentials smoke"),
  },
  {
    label: "Prepare live evidence",
    matches: (command) =>
      command.startsWith("vivarium live evidence-init") || command.startsWith("vivarium proof"),
  },
  {
    label: "Run the readiness gate",
    matches: (command) => command.startsWith("vivarium doctor"),
  },
  {
    label: "Verify the Mac daemon",
    matches: (command) => command.startsWith("vivarium daemon smoke"),
  },
  {
    label: "Review launch handoff",
    matches: (command) => command === "vivarium launch handoff",
  },
  {
    label: "Keep moving",
    matches: (command) =>
      command === "vivarium status" || command === "vivarium help" || command === "vivarium update",
  },
];

export function renderLaunchSequence(
  commands: readonly string[],
  options: RenderLaunchSequenceOptions = {},
): readonly string[] {
  const remaining = [...commands];
  const lines = options.heading === undefined ? [] : [options.heading];
  let stageNumber = options.startAt ?? 1;

  for (const stage of launchCommandStages) {
    const stageCommands = remaining.filter(stage.matches);
    if (stageCommands.length === 0) {
      continue;
    }

    lines.push(`  [${stageNumber}] ${stage.label}`);
    lines.push(...stageCommands.map((command) => `      ${command}`));
    stageNumber += 1;

    for (const command of stageCommands) {
      const index = remaining.indexOf(command);
      if (index !== -1) {
        remaining.splice(index, 1);
      }
    }
  }

  if (remaining.length > 0) {
    lines.push(`  [${stageNumber}] Continue`);
    lines.push(...remaining.map((command) => `      ${command}`));
  }

  return lines;
}
