import { describe, expect, test } from "bun:test";

import * as cli from "./index.js";

describe("CLI public API", () => {
  test("exports every implemented world command helper", () => {
    const exports = cli as unknown as Readonly<Record<string, unknown>>;

    expect(typeof exports.listWorldSubscriptionsCommand).toBe("function");
    expect(typeof exports.searchWorldCommand).toBe("function");
    expect(typeof exports.subscribeWorldCommand).toBe("function");
    expect(typeof exports.pullWorldCommand).toBe("function");
    expect(typeof exports.verifyWorldTransmissionCommand).toBe("function");
  });
});
