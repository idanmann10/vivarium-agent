import type { CredentialKind } from "../../../../packages/core/src/index.js";
import {
  createEncryptedFileCredentialStore,
  createToolDispatcher,
  type ExternalToolAdapters,
} from "../../../../packages/tools/src/index.js";
import type { HttpMethod } from "../../../../packages/tools/src/external/index.js";

export interface CredentialStoreCommandOptions {
  readonly credentialsPath: string;
  readonly masterKey: string;
}

export interface AddCredentialCommandOptions extends CredentialStoreCommandOptions {
  readonly kind: CredentialKind;
  readonly name: string;
  readonly purpose: string;
  readonly value: string;
  readonly scopes?: readonly string[];
}

export interface AddCredentialCommandResult {
  readonly stored: true;
  readonly name: string;
  readonly kind: CredentialKind;
}

export interface ListedCredential {
  readonly name: string;
  readonly kind: CredentialKind;
  readonly purpose: string;
  readonly scopes: readonly string[];
}

export interface ListCredentialsCommandResult {
  readonly credentials: readonly ListedCredential[];
}

export interface CredentialSmokeCommandOptions extends CredentialStoreCommandOptions {
  readonly name: string;
  readonly url: string;
  readonly method?: HttpMethod;
  readonly body?: string;
  readonly fetch?: NonNullable<ExternalToolAdapters["fetch"]>;
}

export type CredentialSmokeCommandResult =
  | {
      readonly ok: true;
      readonly credentialName: string;
      readonly url: string;
      readonly method: HttpMethod;
      readonly status: number;
      readonly bodyPreview: string;
    }
  | {
      readonly ok: false;
      readonly credentialName: string;
      readonly url: string;
      readonly method: HttpMethod;
      readonly error: string;
    };

function store(options: CredentialStoreCommandOptions) {
  return createEncryptedFileCredentialStore({ path: options.credentialsPath, masterKey: options.masterKey });
}

function preview(value: string): string {
  return value.length <= 200 ? value : value.slice(0, 200);
}

export function addCredentialCommand(options: AddCredentialCommandOptions): AddCredentialCommandResult {
  const record = {
    kind: options.kind,
    name: options.name,
    purpose: options.purpose,
    value: options.value,
  };
  store(options).set(options.scopes === undefined ? record : { ...record, scopes: options.scopes });
  return { stored: true, name: options.name, kind: options.kind };
}

export function listCredentialsCommand(options: CredentialStoreCommandOptions): ListCredentialsCommandResult {
  return {
    credentials: store(options).list().map((credential) => ({
      name: credential.name,
      kind: credential.kind,
      purpose: credential.purpose,
      scopes: credential.scopes ?? [],
    })),
  };
}

export async function credentialSmokeCommand(options: CredentialSmokeCommandOptions): Promise<CredentialSmokeCommandResult> {
  const method = options.method ?? "GET";
  const dispatcher = createToolDispatcher({
    credentials: store(options),
    httpSafety: {
      allowlist: [new URL(options.url).origin],
      destructiveRequiresConfirmation: true,
    },
    externalAdapters: options.fetch === undefined ? {} : { fetch: options.fetch },
  });
  const result = await dispatcher.dispatch({
    name: "http.request",
    args: {
      url: options.url,
      method,
      credentialName: options.name,
      ...(options.body === undefined ? {} : { body: options.body }),
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      credentialName: options.name,
      url: options.url,
      method,
      error: result.error,
    };
  }

  const value = result.value as { readonly status?: unknown; readonly body?: unknown };
  return {
    ok: true,
    credentialName: options.name,
    url: options.url,
    method,
    status: typeof value.status === "number" ? value.status : 0,
    bodyPreview: typeof value.body === "string" ? preview(value.body) : "",
  };
}
