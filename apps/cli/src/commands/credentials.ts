import type { CredentialKind } from "../../../../packages/core/src/index.js";
import { createEncryptedFileCredentialStore } from "../../../../packages/tools/src/index.js";

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

function store(options: CredentialStoreCommandOptions) {
  return createEncryptedFileCredentialStore({ path: options.credentialsPath, masterKey: options.masterKey });
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
