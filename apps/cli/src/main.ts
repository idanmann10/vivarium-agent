import { applyVivariumTerminalTheme } from "./commands/branding.js";
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
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
