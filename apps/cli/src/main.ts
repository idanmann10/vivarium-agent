import { applyVivariumTerminalTheme, renderVivariumError } from "./commands/branding.js";
import { dispatchCliCommand } from "./dispatcher.js";

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
  process.stderr.write(
    applyVivariumTerminalTheme(renderVivariumError(message), {
      env: process.env,
      isTty: process.stderr.isTTY,
    }),
  );
  process.exitCode = 1;
}
