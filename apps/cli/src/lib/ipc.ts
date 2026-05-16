export interface DaemonRequest {
  readonly command: string;
  readonly payload: unknown;
}

export function daemonSocketPath(homeDirectory: string): string {
  return `${homeDirectory}/.vivarium/daemon.sock`;
}
