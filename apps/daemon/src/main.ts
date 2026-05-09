import { createDaemonServer } from "./server.js";

export function main(): string {
  return createDaemonServer().status;
}
