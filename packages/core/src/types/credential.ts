export type CredentialKind = "api_key" | "oauth" | "bearer" | "service_account";

export interface CredentialRequirement {
  readonly kind: CredentialKind;
  readonly name: string;
  readonly purpose: string;
  readonly scopes?: readonly string[];
  readonly file?: boolean;
}
