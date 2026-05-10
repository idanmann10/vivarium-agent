import type { CredentialRecord, CredentialStore } from "./credentials/store.js";
import {
  dispatchExternalTool,
  type ComputerScrollToolRequest,
  type ExternalToolAdapters,
  type ExternalToolRequest,
  type ExternalToolResult,
  type HttpMethod,
} from "./external/index.js";
import {
  containsEmbeddedCredential,
  evaluateComputerUseSafety,
  evaluateHttpSafety,
  scanToolOutputForPromptInjection,
  type ComputerUseConfirmationLevel,
} from "./safety/pipeline.js";

export interface ToolDispatchRequest {
  readonly name: string;
  readonly args: unknown;
}

export type ToolDispatchResult =
  | {
      readonly ok: true;
      readonly value: unknown;
      readonly warnings?: readonly string[];
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

export interface ToolRateLimitConfig {
  readonly perRun?: Readonly<Record<string, number>>;
  readonly perDay?: Readonly<Record<string, number>>;
  readonly dailyUsage?: ToolDailyUsageCounter;
  readonly now?: () => Date;
}

export interface ToolDailyUsageCounter {
  incrementToolUsage(toolName: string, day: string): number;
  getToolUsageCount(toolName: string, day: string): number;
}

export interface ComputerUseSafetyConfig {
  readonly confirmationLevel: ComputerUseConfirmationLevel;
}

export interface ToolDispatcherOptions {
  readonly builtinHandlers?: Readonly<Record<string, BuiltinToolHandler>>;
  readonly externalAdapters: ExternalToolAdapters;
  readonly credentials?: CredentialStore;
  readonly httpSafety?: HttpSafetyConfig;
  readonly computerUseSafety?: ComputerUseSafetyConfig;
  readonly rateLimits?: ToolRateLimitConfig;
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

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function isComputerScrollDirection(value: unknown): value is ComputerScrollToolRequest["args"]["direction"] {
  return value === "up" || value === "down" || value === "left" || value === "right";
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

  if ((request.name === "web.fetch" || request.name === "web.read") && typeof request.args.url === "string") {
    return { name: request.name, args: { url: request.args.url } };
  }

  if (request.name === "web.search" && typeof request.args.query === "string") {
    return { name: request.name, args: { query: request.args.query } };
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

  if (request.name === "computer.screenshot") {
    return { name: request.name, args: {} };
  }

  if (request.name === "computer.click" && typeof request.args.target === "string") {
    const systemLevel = optionalBoolean(request.args.systemLevel);
    const confirmed = optionalBoolean(request.args.confirmed);
    return {
      name: request.name,
      args: {
        target: request.args.target,
        ...(systemLevel === undefined ? {} : { systemLevel }),
        ...(confirmed === undefined ? {} : { confirmed }),
      },
    };
  }

  if (request.name === "computer.type" && typeof request.args.text === "string") {
    const target = optionalString(request.args.target);
    const systemLevel = optionalBoolean(request.args.systemLevel);
    const passwordField = optionalBoolean(request.args.passwordField);
    const confirmed = optionalBoolean(request.args.confirmed);
    return {
      name: request.name,
      args: {
        text: request.args.text,
        ...(target === undefined ? {} : { target }),
        ...(systemLevel === undefined ? {} : { systemLevel }),
        ...(passwordField === undefined ? {} : { passwordField }),
        ...(confirmed === undefined ? {} : { confirmed }),
      },
    };
  }

  if (request.name === "computer.scroll" && isComputerScrollDirection(request.args.direction)) {
    const amount = optionalNumber(request.args.amount);
    return {
      name: request.name,
      args: { direction: request.args.direction, ...(amount === undefined ? {} : { amount }) },
    };
  }

  if (request.name === "computer.list_windows") {
    return { name: request.name, args: {} };
  }

  if (request.name === "computer.focus_window" && typeof request.args.windowId === "string") {
    return { name: request.name, args: { windowId: request.args.windowId } };
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
    return result.warnings === undefined || result.warnings.length === 0
      ? { name, status: "ok" }
      : { name, status: "ok", reason: result.warnings.join("; ") };
  }

  return {
    name,
    status: result.blocked === true ? "blocked" : "error",
    reason: result.error,
  };
}

function fromExternalResult(result: ExternalToolResult): ToolDispatchResult {
  if (result.ok) {
    const warnings = scanToolOutputForPromptInjection(result.value).map((finding) => finding.reason);
    return warnings.length === 0 ? result : { ...result, warnings };
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

  if (request.name === "computer.click" || request.name === "computer.type") {
    const decision = evaluateComputerUseSafety({
      action: request.name,
      confirmationLevel: options.computerUseSafety?.confirmationLevel ?? "system_only",
      systemLevel: request.args.systemLevel ?? false,
      passwordField: request.name === "computer.type" ? request.args.passwordField ?? false : false,
      confirmed: request.args.confirmed ?? false,
    });
    if (!decision.allowed) {
      return { ok: false, error: decision.reason, blocked: true };
    }
  }

  return fromExternalResult(await dispatchExternalTool(nextRequest, options.externalAdapters));
}

export function createToolDispatcher(options: ToolDispatcherOptions): ToolDispatcher {
  const counts = new Map<string, number>();

  function currentUtcDay(): string {
    return (options.rateLimits?.now?.() ?? new Date()).toISOString().slice(0, 10);
  }

  function checkRateLimit(name: string): ToolDispatchResult | undefined {
    const limit = options.rateLimits?.perRun?.[name];
    if (limit !== undefined) {
      const nextCount = (counts.get(name) ?? 0) + 1;
      if (nextCount > limit) {
        return { ok: false, error: `Rate limit exceeded for ${name}`, blocked: true };
      }

      counts.set(name, nextCount);
    }

    const dailyLimit = options.rateLimits?.perDay?.[name];
    if (dailyLimit === undefined) {
      return undefined;
    }

    const dailyUsage = options.rateLimits?.dailyUsage;
    if (dailyUsage === undefined) {
      return { ok: false, error: `Daily rate limit counter is not configured for ${name}`, blocked: true };
    }

    const dailyCount = dailyUsage.incrementToolUsage(name, currentUtcDay());
    if (dailyCount > dailyLimit) {
      return { ok: false, error: `Daily rate limit exceeded for ${name}`, blocked: true };
    }

    return undefined;
  }

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

      const rateLimitResult = checkRateLimit(request.name);
      if (rateLimitResult !== undefined) {
        emit(options, dispatchEvent(request.name, rateLimitResult));
        return rateLimitResult;
      }

      if (containsEmbeddedCredential(external.args)) {
        const result = {
          ok: false,
          error: "Tool arguments appear to contain an embedded credential",
          blocked: true,
        } satisfies ToolDispatchResult;
        emit(options, dispatchEvent(request.name, result));
        return result;
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
