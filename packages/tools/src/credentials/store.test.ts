import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { createEncryptedFileCredentialStore, createMemoryCredentialStore } from "./store.js";

describe("credential stores", () => {
  test("stores credentials in memory by name", () => {
    const store = createMemoryCredentialStore();

    store.set({
      kind: "api_key",
      name: "STRIPE_API_KEY",
      purpose: "Issue refunds",
      value: "sk_test_memory",
    });

    expect(store.has("STRIPE_API_KEY")).toBe(true);
    expect(store.get("STRIPE_API_KEY")).toMatchObject({ kind: "api_key", value: "sk_test_memory" });
    expect(store.list().map((credential) => credential.name)).toEqual(["STRIPE_API_KEY"]);
  });

  test("persists encrypted credentials without plaintext secret leakage", () => {
    const path = join(mkdtempSync(join(tmpdir(), "credentials-")), "credentials.enc");
    const first = createEncryptedFileCredentialStore({ path, masterKey: "local-test-master-key" });

    first.set({
      kind: "bearer",
      name: "NOTION_TOKEN",
      purpose: "Read workspace pages",
      scopes: ["read"],
      value: "secret_notion_token",
    });

    const encrypted = readFileSync(path, "utf8");
    expect(encrypted).not.toContain("secret_notion_token");
    expect(encrypted).not.toContain("NOTION_TOKEN");

    const second = createEncryptedFileCredentialStore({ path, masterKey: "local-test-master-key" });
    expect(second.get("NOTION_TOKEN")).toMatchObject({
      kind: "bearer",
      name: "NOTION_TOKEN",
      value: "secret_notion_token",
    });
  });
});
