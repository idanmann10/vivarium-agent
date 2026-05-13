export function renderVivariumGlobe(): string {
  return [
    " __      __ _____ __      __    _     ____  ___  _   _  __  __",
    " \\ \\    / /|_   _|\\ \\    / /   / \\   |  _ \\|_ _|| | | ||  \\/  |",
    "  \\ \\  / /   | |   \\ \\  / /   / _ \\  | |_) || | | | | || |\\/| |",
    "   \\ \\/ /    | |    \\ \\/ /   / ___ \\ |  _ < | | | |_| || |  | |",
    "    \\__/    |____|   \\__/   /_/   \\_\\|_| \\_\\___| \\___/ |_|  |_|",
    "            VIVARIUM // local memory // world culture",
  ].join("\n");
}

export interface VivariumErrorRenderOptions {
  readonly nextCommands?: readonly string[];
}

export function renderVivariumError(
  message: string,
  options: VivariumErrorRenderOptions = {},
): string {
  const nextCommands = options.nextCommands ?? ["vivarium help"];
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Error",
    "--------------",
    `Message: ${message}`,
    "",
    nextCommands.length === 1 ? "Next command:" : "Next commands:",
    ...nextCommands.map((command) => `  ${command}`),
    "",
  ].join("\n");
}

export interface VivariumTerminalThemeOptions {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly isTty?: boolean;
}

const ansi = {
  reset: "\u001b[0m",
  boldCyan: "\u001b[1;36m",
  cyan: "\u001b[36m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  gold: "\u001b[33m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
} as const;

type VivariumTerminalThemeName = "vivarium" | "amber" | "matrix";

const globePalettes: Record<VivariumTerminalThemeName, readonly string[]> = {
  vivarium: [ansi.cyan, ansi.cyan, ansi.blue, ansi.magenta, ansi.blue, ansi.gold],
  amber: [ansi.gold, ansi.gold, ansi.yellow, ansi.gold, ansi.yellow, ansi.gold],
  matrix: [ansi.green, ansi.green, ansi.green, ansi.green, ansi.green, ansi.green],
} as const;

function paint(text: string, style: string): string {
  return `${style}${text}${ansi.reset}`;
}

function shouldUseTerminalColor(options: VivariumTerminalThemeOptions): boolean {
  const env = options.env ?? {};
  const vivariumColor = env.VIVARIUM_COLOR?.toLowerCase();

  if (vivariumColor === "always") {
    return true;
  }
  if (vivariumColor === "never") {
    return false;
  }
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "0") {
    return true;
  }
  if (env.NO_COLOR !== undefined) {
    return false;
  }
  return options.isTty === true;
}

function terminalThemeName(env: Readonly<Record<string, string | undefined>>): VivariumTerminalThemeName {
  const theme = env.VIVARIUM_THEME?.toLowerCase();
  return theme === "amber" || theme === "matrix" ? theme : "vivarium";
}

export function applyVivariumTerminalTheme(
  output: string,
  options: VivariumTerminalThemeOptions = {},
): string {
  if (!shouldUseTerminalColor(options)) {
    return output;
  }

  const globeLines = renderVivariumGlobe().split("\n");
  const globePalette = globePalettes[terminalThemeName(options.env ?? {})];
  return output
    .split("\n")
    .map((line) => {
      const globeLineIndex = globeLines.indexOf(line);
      if (globeLineIndex !== -1) {
        return paint(line, globePalette[globeLineIndex] ?? ansi.cyan);
      }
      if (line.startsWith("Vivarium ")) {
        return paint(line, ansi.boldCyan);
      }
      if (/^  \[\d+\] /.test(line)) {
        return paint(line, ansi.gold);
      }
      if (line.trimStart().startsWith("vivarium ")) {
        return paint(line, ansi.cyan);
      }
      if (line === "Readiness: ready" || line === "Status: configured") {
        return paint(line, ansi.green);
      }
      if (line === "Readiness: needs attention" || line === "Status: needs setup") {
        return paint(line, ansi.yellow);
      }
      return line;
    })
    .join("\n");
}
