import { parseDaemonHost, parseDaemonPort } from "../../../packages/core/src/index.js";
import { createDaemonServer } from "./server.js";
import { startDaemonHttpServer, type RunningDaemonHttpServer } from "./http-transport.js";

export interface DaemonMainConfig {
  readonly hostname: string;
  readonly port: number;
  readonly worldRoot: string;
}

export type DaemonMainEnv = Readonly<Record<string, string | undefined>>;

export function readDaemonMainConfig(env: DaemonMainEnv): DaemonMainConfig {
  return {
    hostname: parseDaemonHost(env.VIVARIUM_DAEMON_HOST),
    port: parseDaemonPort(env.VIVARIUM_DAEMON_PORT),
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
