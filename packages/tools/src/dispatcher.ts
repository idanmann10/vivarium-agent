import type { CredentialRecord, CredentialStore } from "./credentials/store.js";
import {
  dispatchExternalTool,
  type ExternalToolAdapters,
  type ExternalToolRequest,
  type ExternalToolResult,
  type HttpMethod,
} from "./external/index.js";
import { evaluateHttpSafety } from "./safety/pipeline.js";

export interface ToolDispatchRequest {
  readonly name: string;
  readonly args: unknown;
}

export type ToolDispatchResult =
  | {
      readonly ok: true;
      readonly value: unknown;
    }
  | {
      readonly ok: false;
      readonly error: string;
      readonly blocked?: boolean;
    };

export interface ToolDispatchEvent {
  readonly name: string;
  readonly status: "ok" | "error" | "blocked";
  readonly reason?: string;
}

export type BuiltinToolHandler = (args: unknown) => Promise<unknown> | unknown;

export interface HttpSafetyConfig {
  readonly allowlist: readonly string[];
  readonly destructiveRequiresConfirmation: boolean;
}

export interface ToolDispatcherOptions {
  readonly builtinHandlers?: Readonly<Record<string, BuiltinToolHandler>>;
  readonly externalAdapters: ExternalToolAdapters;
  readonly credentials?: CredentialStore;
  readonly httpSafety?: HttpSafetyConfig;
  readonly onDispatch?: (event: ToolDispatchEvent) => void;
}

export interface ToolDispatcher {
  dispatch(request: ToolDispatchRequest): Promise<ToolDispatchResult>;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMethod(value: unknown): value is HttpMethod {
  return value === "GET" || value === "POST" || value === "PUT" || value === "PATCH" || value === "DELETE";
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseExternalRequest(request: ToolDispatchRequest): ExternalToolRequest | undefined {
  if (!isRecord(request.args)) {
    return undefined;
  }

  if (request.name === "http.request") {
    const url = request.args.url;
    const method = request.args.method;
    if (typeof url !== "string" || !isMethod(method)) {
      return undefined;
    }
    const args: ExternalToolRequest["args"] = { url, method };
    const headers = isStringRecord(request.args.headers) ? request.args.headers : undefined;
    const body = optionalString(request.args.body);
    const credentialName = optionalString(request.args.credentialName);
    const confirmed = optionalBoolean(request.args.confirmed);
    const argsWithHeaders = headers === undefined ? args : { ...args, headers };
    const argsWithBody = body === undefined ? argsWithHeaders : { ...argsWithHeaders, body };
    const argsWithCredential =
      credentialName === undefined ? argsWithBody : { ...argsWithBody, credentialName };
    const argsWithConfirmation = confirmed === undefined ? argsWithCredential : { ...argsWithCredential, confirmed };
    return {
      name: request.name,
      args: argsWithConfirmation,
    };
  }

  if (request.name === "file.read" && typeof request.args.path === "string") {
    return { name: request.name, args: { path: request.args.path } };
  }

  if (request.name === "file.write" && typeof request.args.path === "string" && typeof request.args.content === "string") {
    return { name: request.name, args: { path: request.args.path, content: request.args.content } };
  }

  if (
    request.name === "file.edit" &&
    typeof request.args.path === "string" &&
    typeof request.args.search === "string" &&
    typeof request.args.replace === "string"
  ) {
    return {
      name: request.name,
      args: { path: request.args.path, search: request.args.search, replace: request.args.replace },
    };
  }

  if (request.name === "terminal.run" && typeof request.args.command === "string") {
    return { name: request.name, args: { command: request.args.command } };
  }

  if (request.name === "code.execute" && typeof request.args.language === "string" && typeof request.args.code === "string") {
    return { name: request.name, args: { language: request.args.language, code: request.args.code } };
  }

  if (request.name === "mcp.call" && typeof request.args.server === "string" && typeof request.args.tool === "string") {
    return { name: request.name, args: { server: request.args.server, tool: request.args.tool, input: request.args.input } };
  }

  return undefined;
}

function credentialHeaders(credential: CredentialRecord): Readonly<Record<string, string>> {
  if (credential.kind === "api_key") {
    return { "x-api-key": credential.value };
  }

  if (credential.kind === "bearer" || credential.kind === "oauth") {
    return { authorization: `Bearer ${credential.value}` };
  }

  return { authorization: credential.value };
}

function mergeHeaders(
  left: Readonly<Record<string, string>> | undefined,
  right: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return { ...(left ?? {}), ...right };
}

function emit(options: ToolDispatcherOptions, event: ToolDispatchEvent): void {
  options.onDispatch?.(event);
}

function dispatchEvent(name: string, result: ToolDispatchResult): ToolDispatchEvent {
  if (result.ok) {
    return { name, status: "ok" };
  }

  return {
    name,
    status: result.blocked === true ? "blocked" : "error",
    reason: result.error,
  };
}

function fromExternalResult(result: ExternalToolResult): ToolDispatchResult {
  if (result.ok) {
    return result;
  }

  return { ok: false, error: result.error };
}

async function dispatchExternal(
  request: ExternalToolRequest,
  options: ToolDispatcherOptions,
): Promise<ToolDispatchResult> {
  let nextRequest = request;

  if (request.name === "http.request") {
    if (options.httpSafety !== undefined) {
      const decision = evaluateHttpSafety({
        url: request.args.url,
        method: request.args.method,
        allowlist: options.httpSafety.allowlist,
        destructiveRequiresConfirmation: options.httpSafety.destructiveRequiresConfirmation,
        confirmed: request.args.confirmed ?? false,
      });
      if (!decision.allowed) {
        return { ok: false, error: decision.reason, blocked: true };
      }
    }

    if (request.args.credentialName !== undefined) {
      const credential = options.credentials?.get(request.args.credentialName);
      if (credential === undefined) {
        return { ok: false, error: `Missing credential: ${request.args.credentialName}` };
      }
      nextRequest = {
        ...request,
        args: {
          ...request.args,
          headers: mergeHeaders(request.args.headers, credentialHeaders(credential)),
        },
      };
    }
  }

  return fromExternalResult(await dispatchExternalTool(nextRequest, options.externalAdapters));
}

export function createToolDispatcher(options: ToolDispatcherOptions): ToolDispatcher {
  return {
    async dispatch(request) {
      const builtin = options.builtinHandlers?.[request.name];
      if (builtin !== undefined) {
        try {
          const value = await builtin(request.args);
          emit(options, { name: request.name, status: "ok" });
          return { ok: true, value };
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Builtin tool failed";
          emit(options, { name: request.name, status: "error", reason });
          return { ok: false, error: reason };
        }
      }

      const external = parseExternalRequest(request);
      if (external === undefined) {
        const reason = `Unknown or invalid tool request: ${request.name}`;
        emit(options, { name: request.name, status: "error", reason });
        return { ok: false, error: reason };
      }

      const result = await dispatchExternal(external, options);
      emit(options, dispatchEvent(request.name, result));
      return result;
    },
  };
}

export function dispatchTool(request: ToolDispatchRequest): string {
  return `queued:${request.name}`;
}
