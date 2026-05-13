export function renderVivariumGlobe(): string {
  return [
    '          .-""""-.',
    "       .-'  .--.  '-.",
    "      /   .' VI '.   \\",
    "     |    | VAR |    |",
    "      \\   '.IUM.'   /",
    "       '-.  '--'  .-'",
    "          '-.__.-'",
  ].join("\n");
}

export function renderVivariumError(message: string): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Error",
    "--------------",
    `Message: ${message}`,
    "",
    "Next command:",
    "  vivarium help",
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

const globePalette = [
  ansi.cyan,
  ansi.cyan,
  ansi.blue,
  ansi.magenta,
  ansi.blue,
  ansi.cyan,
  ansi.gold,
] as const;

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

export function applyVivariumTerminalTheme(
  output: string,
  options: VivariumTerminalThemeOptions = {},
): string {
  if (!shouldUseTerminalColor(options)) {
    return output;
  }

  const globeLines = renderVivariumGlobe().split("\n");
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
