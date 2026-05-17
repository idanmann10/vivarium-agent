import { describe, expect, test } from "bun:test";

import { readDaemonMainConfig } from "./main.js";

describe("readDaemonMainConfig", () => {
  test("uses local daemon defaults", () => {
    expect(readDaemonMainConfig({})).toEqual({
      hostname: "127.0.0.1",
      port: 8787,
      worldRoot: "../the-world",
    });
  });

  test("reads host, port, and world root from environment", () => {
    expect(
      readDaemonMainConfig({
        VIVARIUM_DAEMON_HOST: "0.0.0.0",
        VIVARIUM_DAEMON_PORT: "9797",
        VIVARIUM_WORLD_ROOT: "/world",
      }),
    ).toEqual({
      hostname: "0.0.0.0",
      port: 9797,
      worldRoot: "/world",
    });
  });

  test("rejects invalid ports", () => {
    expect(() => readDaemonMainConfig({ VIVARIUM_DAEMON_PORT: "not-a-port" })).toThrow(
      "VIVARIUM_DAEMON_PORT must be an integer from 1 to 65535",
    );
    expect(() => readDaemonMainConfig({ VIVARIUM_DAEMON_PORT: "70000" })).toThrow(
      "VIVARIUM_DAEMON_PORT must be an integer from 1 to 65535",
    );
  });

  test("rejects invalid hosts", () => {
    expect(() => readDaemonMainConfig({ VIVARIUM_DAEMON_HOST: "bad host" })).toThrow(
      "VIVARIUM_DAEMON_HOST must be a hostname or IPv4 address without a scheme, path, port, or spaces",
    );
  });
});
