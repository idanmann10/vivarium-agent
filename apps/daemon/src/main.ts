import { createDaemonServer } from "./server.js";
import { startDaemonHttpServer, type RunningDaemonHttpServer } from "./http-transport.js";

export interface DaemonMainConfig {
  readonly hostname: string;
  readonly port: number;
  readonly worldRoot: string;
}

export type DaemonMainEnv = Readonly<Record<string, string | undefined>>;

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
    hostname: env.VIVARIUM_DAEMON_HOST ?? "127.0.0.1",
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
