import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { addCredentialCommand, listCredentialsCommand } from "./credentials.js";

describe("credential commands", () => {
  test("adds and lists encrypted credentials without returning secret values", () => {
    const credentialsPath = join(mkdtempSync(join(tmpdir(), "cli-credentials-")), "credentials.enc");
    const store = { credentialsPath, masterKey: "cli-test-key" };

    expect(
      addCredentialCommand({
        ...store,
        kind: "api_key",
        name: "STRIPE_API_KEY",
        purpose: "Issue refunds",
        value: "sk_test_secret",
      }),
    ).toEqual({ stored: true, name: "STRIPE_API_KEY", kind: "api_key" });

    expect(listCredentialsCommand(store)).toEqual({
      credentials: [{ name: "STRIPE_API_KEY", kind: "api_key", purpose: "Issue refunds", scopes: [] }],
    });
  });
});
