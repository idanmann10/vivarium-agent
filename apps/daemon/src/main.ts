import { join } from "node:path";
import { parseDaemonHost, parseDaemonPort } from "../../../packages/core/src/index.js";
import { createDaemonServer } from "./server.js";
import { startDaemonHttpServer, type RunningDaemonHttpServer } from "./http-transport.js";

export interface DaemonMainConfig {
  readonly hostname: string;
  readonly port: number;
  readonly statePath?: string;
  readonly worldRoot: string;
}

export type DaemonMainEnv = Readonly<Record<string, string | undefined>>;

function defaultDaemonStatePath(env: DaemonMainEnv): string | undefined {
  const configured = env.VIVARIUM_STATE_PATH?.trim();
  if (configured !== undefined && configured.length > 0) {
    return configured;
  }

  const home = env.HOME?.trim();
  return home === undefined || home.length === 0 ? undefined : join(home, ".vivarium", "state.db");
}

export function readDaemonMainConfig(env: DaemonMainEnv): DaemonMainConfig {
  const statePath = defaultDaemonStatePath(env);
  return {
    hostname: parseDaemonHost(env.VIVARIUM_DAEMON_HOST),
    port: parseDaemonPort(env.VIVARIUM_DAEMON_PORT),
    ...(statePath === undefined ? {} : { statePath }),
    worldRoot: env.VIVARIUM_WORLD_ROOT ?? "../the-world",
  };
}

export function startDaemonMain(env: DaemonMainEnv = Bun.env): RunningDaemonHttpServer {
  const config = readDaemonMainConfig(env);
  return startDaemonHttpServer({
    daemon: createDaemonServer({
      ...(config.statePath === undefined ? {} : { statePath: config.statePath }),
      worldRoot: config.worldRoot,
    }),
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
