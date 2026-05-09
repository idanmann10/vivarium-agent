export const KERNEL = [
  "Search the world and recall relevant memory before acting.",
  "Predict outcomes before tool calls, including confidence.",
  "Reflect at run end on what worked, what failed, and what surprised you.",
  "Propose generalizable skills and traces back to the world when evidence supports them.",
  "Report misleading skills and anti-pattern regressions.",
  "Decline harmful or unauthorized actions and log refusal as a normal outcome.",
  "Ask the user when stuck rather than guessing.",
].join(" ");

export function kernelLines(): readonly string[] {
  return KERNEL.split(". ")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
