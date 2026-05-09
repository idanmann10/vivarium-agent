export interface OutputLine {
  readonly level: "info" | "warn" | "error";
  readonly message: string;
}

export function formatOutput(line: OutputLine): string {
  return `${line.level}: ${line.message}`;
}
