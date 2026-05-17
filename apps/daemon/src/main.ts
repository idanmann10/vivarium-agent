import { createDaemonServer } from "./server.js";
import { startDaemonHttpServer, type RunningDaemonHttpServer } from "./http-transport.js";

export interface DaemonMainConfig {
  readonly hostname: string;
  readonly port: number;
  readonly worldRoot: string;
}

export type DaemonMainEnv = Readonly<Record<string, string | undefined>>;

const daemonHostError =
  "VIVARIUM_DAEMON_HOST must be a hostname or IPv4 address without a scheme, path, port, or spaces";

function isValidHostname(raw: string): boolean {
  if (raw.length < 1 || raw.length > 253) {
    return false;
  }

  if (/[\s:/?#\\[\]@]/.test(raw)) {
    return false;
  }

  if (raw === "localhost") {
    return true;
  }

  if (/^[0-9]+(?:\.[0-9]+){3}$/.test(raw)) {
    return raw.split(".").every((part) => {
      if (part.length > 1 && part.startsWith("0")) {
        return false;
      }
      const octet = Number.parseInt(part, 10);
      return octet >= 0 && octet <= 255;
    });
  }

  return raw
    .split(".")
    .every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}

function parseHostname(raw: string | undefined): string {
  const hostname = raw ?? "127.0.0.1";
  if (!isValidHostname(hostname)) {
    throw new Error(daemonHostError);
  }
  return hostname;
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) {
    return 8787;
  }

  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || String(port) !== raw || port < 1 || port > 65535) {
    throw new Error("VIVARIUM_DAEMON_PORT must be an integer from 1 to 65535");
  }
  return port;
}

export function readDaemonMainConfig(env: DaemonMainEnv): DaemonMainConfig {
  return {
    hostname: parseHostname(env.VIVARIUM_DAEMON_HOST),
    port: parsePort(env.VIVARIUM_DAEMON_PORT),
    worldRoot: env.VIVARIUM_WORLD_ROOT ?? "../the-world",
  };
}

export function startDaemonMain(env: DaemonMainEnv = Bun.env): RunningDaemonHttpServer {
  const config = readDaemonMainConfig(env);
  return startDaemonHttpServer({
    daemon: createDaemonServer({ worldRoot: config.worldRoot }),
    hostname: config.hostname,
    port: config.port,
  });
}

export function main(env: DaemonMainEnv = Bun.env): string {
  return startDaemonMain(env).url;
}

if (import.meta.main) {
  const server = startDaemonMain(Bun.env);
  console.log(`daemon listening on ${server.url}`);
}
