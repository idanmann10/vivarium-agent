import { describe, expect, test } from "bun:test";

import { createMcpToolManifest } from "./mcp-server.js";

describe("createMcpToolManifest", () => {
  test("exposes runtime daemon tools", () => {
    expect(createMcpToolManifest().tools.map((tool) => tool.name)).toEqual(["run_goal", "dream", "status"]);
  });
});
