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
    matches: (command) => command.startsWith("vivarium setup") && !command.includes("--env-file"),
  },
  {
    label: "Prove the local loop",
    matches: (command) => command.startsWith("vivarium run "),
  },
  {
    label: "Prepare live readiness",
    matches: (command) =>
      command.startsWith("vivarium live env-init ") ||
      (command.startsWith("vivarium setup") && command.includes("--env-file")),
  },
  {
    label: "Inspect configured models",
    matches: (command) => command.startsWith("vivarium model"),
  },
  {
    label: "Run the readiness gate",
    matches: (command) => command.startsWith("vivarium doctor"),
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
