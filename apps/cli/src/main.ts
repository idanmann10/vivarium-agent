import { applyVivariumTerminalTheme, renderVivariumError } from "./commands/branding.js";
import { CliUsageError, dispatchCliCommand } from "./dispatcher.js";

try {
  const result = await dispatchCliCommand(Bun.argv.slice(2));
  process.stdout.write(
    applyVivariumTerminalTheme(result.output, {
      env: process.env,
      isTty: process.stdout.isTTY,
    }),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown CLI error";
  const nextCommands = error instanceof CliUsageError ? error.nextCommands : undefined;
  const renderOptions = nextCommands === undefined ? {} : { nextCommands };
  process.stderr.write(
    applyVivariumTerminalTheme(renderVivariumError(message, renderOptions), {
      env: process.env,
      isTty: process.stderr.isTTY,
    }),
  );
  process.exitCode = 1;
}
