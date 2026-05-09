import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const externalToolsets = ["web", "file", "terminal", "code", "http", "mcp", "computer-use"] as const;

export type ExternalToolset = (typeof externalToolsets)[number];

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpToolRequest {
  readonly name: "http.request";
  readonly args: {
    readonly url: string;
    readonly method: HttpMethod;
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: string;
    readonly credentialName?: string;
    readonly confirmed?: boolean;
  };
}

export interface WebFetchToolRequest {
  readonly name: "web.fetch";
  readonly args: {
    readonly url: string;
  };
}

export interface WebReadToolRequest {
  readonly name: "web.read";
  readonly args: {
    readonly url: string;
  };
}

export interface WebSearchToolRequest {
  readonly name: "web.search";
  readonly args: {
    readonly query: string;
  };
}

export interface FileReadToolRequest {
  readonly name: "file.read";
  readonly args: {
    readonly path: string;
  };
}

export interface FileWriteToolRequest {
  readonly name: "file.write";
  readonly args: {
    readonly path: string;
    readonly content: string;
  };
}

export interface FileEditToolRequest {
  readonly name: "file.edit";
  readonly args: {
    readonly path: string;
    readonly search: string;
    readonly replace: string;
  };
}

export interface TerminalToolRequest {
  readonly name: "terminal.run";
  readonly args: {
    readonly command: string;
  };
}

export interface CodeToolRequest {
  readonly name: "code.execute";
  readonly args: {
    readonly language: string;
    readonly code: string;
  };
}

export interface McpToolRequest {
  readonly name: "mcp.call";
  readonly args: {
    readonly server: string;
    readonly tool: string;
    readonly input: unknown;
  };
}

export type ExternalToolRequest =
  | HttpToolRequest
  | WebFetchToolRequest
  | WebReadToolRequest
  | WebSearchToolRequest
  | FileReadToolRequest
  | FileWriteToolRequest
  | FileEditToolRequest
  | TerminalToolRequest
  | CodeToolRequest
  | McpToolRequest;

export interface ProcessToolResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface FileEditResult {
  readonly replacements: number;
}

export interface WebSearchResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
}

export interface FileToolAdapter {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  edit(path: string, search: string, replace: string): Promise<FileEditResult>;
}

export interface ExternalToolAdapters {
  readonly fetch?: (request: Request) => Promise<Response>;
  readonly searchWeb?: (query: string) => Promise<readonly WebSearchResult[]>;
  readonly files?: FileToolAdapter;
  readonly runTerminal?: (command: string) => Promise<ProcessToolResult>;
  readonly executeCode?: (request: CodeToolRequest["args"]) => Promise<ProcessToolResult>;
  readonly callMcp?: (request: McpToolRequest["args"]) => Promise<unknown>;
}

export type ExternalToolResult =
  | {
      readonly ok: true;
      readonly value: unknown;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export interface AllowlistedFileAdapterOptions {
  readonly allowlist: readonly string[];
}

type RequestInitWithDefinedValues = {
  readonly method: HttpMethod;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
};

function headerRecord(headers: Headers): Readonly<Record<string, string>> {
  return Object.fromEntries(headers.entries());
}

function readableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isInsideAllowlist(path: string, allowlist: readonly string[]): boolean {
  const resolvedPath = resolve(path);
  return allowlist.some((entry) => {
    const resolvedEntry = resolve(entry);
    return resolvedPath === resolvedEntry || resolvedPath.startsWith(`${resolvedEntry}/`);
  });
}

export function createAllowlistedFileAdapter(options: AllowlistedFileAdapterOptions): FileToolAdapter {
  function assertAllowed(path: string): void {
    if (!isInsideAllowlist(path, options.allowlist)) {
      throw new Error("File path is outside the configured allowlist");
    }
  }

  return {
    async read(path) {
      assertAllowed(path);
      return readFileSync(path, "utf8");
    },
    async write(path, content) {
      assertAllowed(path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, "utf8");
    },
    async edit(path, search, replace) {
      assertAllowed(path);
      if (!existsSync(path)) {
        throw new Error("File does not exist");
      }
      const current = readFileSync(path, "utf8");
      const replacements = current.split(search).length - 1;
      writeFileSync(path, current.split(search).join(replace), "utf8");
      return { replacements };
    },
  };
}

function missingAdapter(name: string): ExternalToolResult {
  return { ok: false, error: `Missing external adapter for ${name}` };
}

async function attempt(operation: () => Promise<unknown>): Promise<ExternalToolResult> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "External tool failed" };
  }
}

export async function dispatchExternalTool(
  request: ExternalToolRequest,
  adapters: ExternalToolAdapters,
): Promise<ExternalToolResult> {
  if (request.name === "http.request") {
    const fetchAdapter = adapters.fetch;
    if (fetchAdapter === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(async () => {
      const init: RequestInitWithDefinedValues = { method: request.args.method };
      const initWithHeaders =
        request.args.headers === undefined ? init : { ...init, headers: request.args.headers };
      const initWithBody = request.args.body === undefined ? initWithHeaders : { ...initWithHeaders, body: request.args.body };
      const response = await fetchAdapter(new Request(request.args.url, initWithBody));
      return { status: response.status, headers: headerRecord(response.headers), body: await response.text() };
    });
  }

  if (request.name === "web.fetch") {
    const fetchAdapter = adapters.fetch;
    if (fetchAdapter === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(async () => {
      const response = await fetchAdapter(new Request(request.args.url, { method: "GET" }));
      return { status: response.status, headers: headerRecord(response.headers), body: await response.text() };
    });
  }

  if (request.name === "web.read") {
    const fetchAdapter = adapters.fetch;
    if (fetchAdapter === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(async () => {
      const response = await fetchAdapter(new Request(request.args.url, { method: "GET" }));
      return { status: response.status, text: readableText(await response.text()) };
    });
  }

  if (request.name === "web.search") {
    const searchWeb = adapters.searchWeb;
    if (searchWeb === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => searchWeb(request.args.query));
  }

  if (request.name === "file.read") {
    const files = adapters.files;
    if (files === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => files.read(request.args.path));
  }

  if (request.name === "file.write") {
    const files = adapters.files;
    if (files === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(async () => {
      await files.write(request.args.path, request.args.content);
      return { written: true };
    });
  }

  if (request.name === "file.edit") {
    const files = adapters.files;
    if (files === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => files.edit(request.args.path, request.args.search, request.args.replace));
  }

  if (request.name === "terminal.run") {
    const runTerminal = adapters.runTerminal;
    if (runTerminal === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => runTerminal(request.args.command));
  }

  if (request.name === "code.execute") {
    const executeCode = adapters.executeCode;
    if (executeCode === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => executeCode(request.args));
  }

  const callMcp = adapters.callMcp;
  if (callMcp === undefined) {
    return missingAdapter(request.name);
  }
  return attempt(() => callMcp(request.args));
}
