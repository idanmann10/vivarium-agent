import { describe, expect, test } from "bun:test";

import { daemonSocketPath } from "./ipc.js";

describe("daemonSocketPath", () => {
  test("keeps daemon IPC under the Vivarium home directory", () => {
    expect(daemonSocketPath("/Users/example")).toBe("/Users/example/.vivarium/daemon.sock");
  });
});
