import type { CredentialKind } from "../../../core/src/index.js";
import type { CredentialRecord, CredentialStore } from "./store.js";

export interface CredentialLookup {
  readonly name: string;
  readonly kind: CredentialKind;
  readonly purpose: string;
}

export interface CredentialResolution {
  readonly found: boolean;
  readonly credential?: CredentialRecord;
}

export function resolveCredential(store: CredentialStore, lookup: CredentialLookup): CredentialResolution {
  const credential = store.get(lookup.name);
  if (credential === undefined || credential.kind !== lookup.kind) {
    return { found: false };
  }

  return { found: true, credential };
}
