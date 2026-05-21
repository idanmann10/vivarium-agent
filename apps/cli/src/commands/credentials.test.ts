import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  addCredentialCommand,
  credentialSmokeCommand,
  listCredentialsCommand,
  renderListCredentialsCommandResult,
} from "./credentials.js";

describe("credential commands", () => {
  test("points empty credential guidance at connect setup", () => {
    const credentialsPath = join(mkdtempSync(join(tmpdir(), "cli-credentials-empty-")), "credentials.enc");
    const output = renderListCredentialsCommandResult(
      listCredentialsCommand({ credentialsPath, masterKey: "cli-test-key" }),
    );

    expect(output).toContain("Credentials: 0");
    expect(output).toContain("vivarium connect signup");
    expect(output).toContain("vivarium connect fill");
    expect(output).toContain("vivarium connect setup --confirm-write");
    expect(output).toContain(
      [
        "Next commands:",
        "  vivarium connect signup",
        "  vivarium connect fill",
        "  vivarium connect setup --confirm-write",
      ].join("\n"),
    );
    expect(output).not.toContain("vivarium live setup --env-file live-readiness.local.env --confirm-write");
  });

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

  test("smokes an encrypted credential through the HTTP dispatcher without returning the secret", async () => {
    const credentialsPath = join(mkdtempSync(join(tmpdir(), "cli-credentials-smoke-")), "credentials.enc");
    const store = { credentialsPath, masterKey: "cli-test-key" };
    addCredentialCommand({
      ...store,
      kind: "bearer",
      name: "INTERNAL_API_TOKEN",
      purpose: "Call internal health endpoint",
      value: "internal-secret",
    });

    let authorization = "";
    const result = await credentialSmokeCommand({
      ...store,
      name: "INTERNAL_API_TOKEN",
      url: "https://internal.example.test/health",
      method: "GET",
      fetch: async (request) => {
        authorization = request.headers.get("authorization") ?? "";
        return Response.json({ status: "ok" });
      },
    });

    expect(result).toEqual({
      ok: true,
      credentialName: "INTERNAL_API_TOKEN",
      url: "https://internal.example.test/health",
      method: "GET",
      status: 200,
      bodyPreview: "{\"status\":\"ok\"}",
    });
    expect(authorization).toBe("Bearer internal-secret");
    expect(JSON.stringify(result)).not.toContain("internal-secret");
  });

  test("reports missing credentials during credential smoke without calling HTTP", async () => {
    const credentialsPath = join(mkdtempSync(join(tmpdir(), "cli-credentials-missing-")), "credentials.enc");
    const result = await credentialSmokeCommand({
      credentialsPath,
      masterKey: "cli-test-key",
      name: "INTERNAL_API_TOKEN",
      url: "https://internal.example.test/health",
      method: "GET",
      fetch: async () => {
        throw new Error("fetch should not run without a credential");
      },
    });

    expect(result).toEqual({
      ok: false,
      credentialName: "INTERNAL_API_TOKEN",
      url: "https://internal.example.test/health",
      method: "GET",
      error: "Missing credential: INTERNAL_API_TOKEN",
    });
  });
});
