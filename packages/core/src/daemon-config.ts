export const daemonHostError =
  "VIVARIUM_DAEMON_HOST must be a hostname or IPv4 address without a scheme, path, port, or spaces";

export const daemonPortError = "VIVARIUM_DAEMON_PORT must be an integer from 1 to 65535";

export function isValidDaemonHost(raw: string): boolean {
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

export function parseDaemonHost(raw: string | undefined): string {
  const hostname = raw ?? "127.0.0.1";
  if (!isValidDaemonHost(hostname)) {
    throw new Error(daemonHostError);
  }
  return hostname;
}

export function parseDaemonPort(raw: string | undefined): number {
  if (raw === undefined) {
    return 8787;
  }

  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || String(port) !== raw || port < 1 || port > 65535) {
    throw new Error(daemonPortError);
  }
  return port;
}
