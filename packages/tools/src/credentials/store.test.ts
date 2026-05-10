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

  test("persists OAuth scopes and service-account file credentials", () => {
    const path = join(mkdtempSync(join(tmpdir(), "credentials-kinds-")), "credentials.enc");
    const store = createEncryptedFileCredentialStore({ path, masterKey: "local-test-master-key" });

    store.set({
      kind: "oauth",
      name: "GMAIL_OAUTH",
      purpose: "Read mail",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      value: "oauth-refresh-token",
    });
    store.set({
      kind: "service_account",
      name: "GCP_SERVICE_ACCOUNT",
      purpose: "Read internal project metadata",
      file: true,
      value: "{\"client_email\":\"agent@example.test\"}",
    });

    const reopened = createEncryptedFileCredentialStore({ path, masterKey: "local-test-master-key" });

    expect(reopened.get("GMAIL_OAUTH")).toMatchObject({
      kind: "oauth",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      value: "oauth-refresh-token",
    });
    expect(reopened.get("GCP_SERVICE_ACCOUNT")).toMatchObject({
      kind: "service_account",
      file: true,
      value: "{\"client_email\":\"agent@example.test\"}",
    });
    const encrypted = readFileSync(path, "utf8");
    expect(encrypted).not.toContain("oauth-refresh-token");
    expect(encrypted).not.toContain("agent@example.test");
  });
});
