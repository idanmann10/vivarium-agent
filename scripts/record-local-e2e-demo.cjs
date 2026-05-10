const { mkdtempSync, mkdirSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

function readFlag(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    return undefined;
  }
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for --${name}`);
  }
  return value;
}

function commandText(command, args) {
  return [command, ...args].join(" ");
}

function event(time, text) {
  return JSON.stringify([Number(time.toFixed(3)), "o", text]);
}

function replaceAll(text, search, replacement) {
  return text.split(search).join(replacement);
}

const repoRoot = resolve(__dirname, "..");
const demoRoot = mkdtempSync(join(tmpdir(), "vivarium-local-e2e-demo-"));
const output = resolve(repoRoot, readFlag("output") ?? "docs/demos/local-e2e.cast");
const worldRoot = resolve(repoRoot, readFlag("world-root") ?? "../the-world");
const statePath = resolve(repoRoot, readFlag("state-path") ?? join(demoRoot, "state.db"));
const pullDestination = resolve(repoRoot, readFlag("pull-destination") ?? join(demoRoot, "world-second-install"));

function sanitize(text) {
  return replaceAll(replaceAll(text, statePath, "<demo-state.db>"), pullDestination, "<demo-world-second-install>").replace(
    /run-\d+-\d+/g,
    "run-demo-000",
  );
}

const steps = [
  {
    command: "bun",
    args: [
      "apps/cli/src/main.ts",
      "init",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--provider",
      "anthropic:claude",
      "--credential",
      "internal-api",
    ],
  },
  {
    command: "bun",
    args: [
      "apps/cli/src/main.ts",
      "run",
      "--goal",
      "validate local cultural transmission",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
    ],
  },
  {
    command: "bun",
    args: [
      "apps/cli/src/main.ts",
      "world",
      "transmission-smoke",
      "--remote",
      worldRoot,
      "--destination",
      pullDestination,
      "--ref",
      "main",
      "--domain",
      "coding",
      "--query",
      "test before implementation",
      "--limit",
      "2",
    ],
  },
  {
    command: "bun",
    args: ["run", "verify:sqlite-stack"],
  },
];

const lines = [
  JSON.stringify({
    version: 2,
    width: 120,
    height: 36,
    timestamp: 0,
    env: { SHELL: "/bin/zsh", TERM: "xterm-256color" },
  }),
];

let time = 0;
for (const step of steps) {
  lines.push(event(time, sanitize(`$ ${commandText(step.command, step.args)}\n`)));
  time += 0.08;

  const result = spawnSync(step.command, step.args, { cwd: repoRoot, encoding: "utf8" });
  const outputText = `${result.stderr}${result.stdout}`;
  if (outputText.length > 0) {
    lines.push(event(time, sanitize(outputText.endsWith("\n") ? outputText : `${outputText}\n`)));
    time += 0.12;
  }
  if (result.status !== 0) {
    lines.push(event(time, `demo command failed with exit ${result.status}\n`));
    throw new Error(`${commandText(step.command, step.args)} failed with exit ${result.status}`);
  }
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${lines.join("\n")}\n`);
console.log(output);
