import { dispatchCliCommand } from "./dispatcher.js";

try {
  const result = await dispatchCliCommand(Bun.argv.slice(2));
  process.stdout.write(result.output);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown CLI error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
