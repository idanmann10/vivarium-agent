import { describe, expect, test } from "bun:test";

import {
  daemonHostError,
  daemonPortError,
  parseDaemonHost,
  parseDaemonPort,
} from "./index.js";

describe("daemon config validation", () => {
  test("parses default, hostname, and IPv4 daemon hosts", () => {
    expect(parseDaemonHost(undefined)).toBe("127.0.0.1");
    expect(parseDaemonHost("localhost")).toBe("localhost");
    expect(parseDaemonHost("vivarium.local")).toBe("vivarium.local");
    expect(parseDaemonHost("0.0.0.0")).toBe("0.0.0.0");
  });

  test("rejects daemon hosts that would render broken URLs or shell handoffs", () => {
    for (const host of ["bad host", "http://127.0.0.1", "127.0.0.1:8787", "host/path"]) {
      expect(() => parseDaemonHost(host)).toThrow(daemonHostError);
    }
  });

  test("parses default and explicit daemon ports", () => {
    expect(parseDaemonPort(undefined)).toBe(8787);
    expect(parseDaemonPort("9898")).toBe(9898);
  });

  test("rejects daemon ports outside the LaunchAgent-safe range", () => {
    for (const port of ["not-a-port", "0", "65536", "01"]) {
      expect(() => parseDaemonPort(port)).toThrow(daemonPortError);
    }
  });
});
