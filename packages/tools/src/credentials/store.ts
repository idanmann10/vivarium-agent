import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CredentialKind } from "../../../core/src/index.js";

export interface CredentialRecord {
  readonly kind: CredentialKind;
  readonly name: string;
  readonly purpose: string;
  readonly value: string;
  readonly scopes?: readonly string[];
  readonly file?: boolean;
}

export interface CredentialStore {
  set(record: CredentialRecord): void;
  get(name: string): CredentialRecord | undefined;
  has(name: string): boolean;
  list(): readonly CredentialRecord[];
  delete(name: string): void;
}

export interface EncryptedFileCredentialStoreOptions {
  readonly path: string;
  readonly masterKey: string;
}

type StoredCredentials = Readonly<Record<string, CredentialRecord>>;

const encoding = "utf8";

function deriveKey(masterKey: string): Buffer {
  return createHash("sha256").update(masterKey).digest();
}

function serialize(records: StoredCredentials, masterKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(masterKey), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(records), encoding), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function deserialize(text: string, masterKey: string): StoredCredentials {
  const [version, iv, tag, encrypted] = text.split(":");
  if (version !== "v1" || iv === undefined || tag === undefined || encrypted === undefined) {
    throw new Error("Unsupported credential file format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(masterKey), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]);
  return JSON.parse(decrypted.toString(encoding)) as StoredCredentials;
}

function createStore(read: () => StoredCredentials, write: (records: StoredCredentials) => void): CredentialStore {
  return {
    set(record) {
      write({ ...read(), [record.name]: record });
    },
    get(name) {
      return read()[name];
    },
    has(name) {
      return read()[name] !== undefined;
    },
    list() {
      return Object.values(read()).sort((left, right) => left.name.localeCompare(right.name));
    },
    delete(name) {
      const records = { ...read() };
      delete records[name];
      write(records);
    },
  };
}

export function createMemoryCredentialStore(initial: readonly CredentialRecord[] = []): CredentialStore {
  let records: StoredCredentials = Object.fromEntries(initial.map((record) => [record.name, record]));
  return createStore(
    () => records,
    (next) => {
      records = next;
    },
  );
}

export function createEncryptedFileCredentialStore(options: EncryptedFileCredentialStoreOptions): CredentialStore {
  function read(): StoredCredentials {
    if (!existsSync(options.path)) {
      return {};
    }
    return deserialize(readFileSync(options.path, encoding), options.masterKey);
  }

  function write(records: StoredCredentials): void {
    mkdirSync(dirname(options.path), { recursive: true });
    writeFileSync(options.path, serialize(records, options.masterKey), encoding);
  }

  return createStore(read, write);
}
