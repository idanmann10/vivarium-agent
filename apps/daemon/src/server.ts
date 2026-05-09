export interface DaemonServer {
  readonly status: "not-started" | "running";
}

export function createDaemonServer(): DaemonServer {
  return { status: "not-started" };
}
