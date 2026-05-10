import { describe, expect, test } from "bun:test";

import { storageTables } from "./schema.js";
import { stateDrizzleTableNames, stateDrizzleTables } from "./drizzle-schema.js";

describe("state Drizzle schema", () => {
  test("declares Drizzle tables for every runtime storage table", () => {
    expect(stateDrizzleTableNames).toEqual(storageTables);
    expect(Object.keys(stateDrizzleTables).sort()).toEqual([...storageTables].sort());
  });
});
