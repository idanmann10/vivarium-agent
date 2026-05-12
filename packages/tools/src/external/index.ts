import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

export const externalToolsets = [
  "web",
  "file",
  "terminal",
  "code",
  "http",
  "mcp",
  "anthropic-native",
  "computer-use",
] as const;

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

export interface AnthropicNativeMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface AnthropicNativeMessagesCreateToolRequest {
  readonly name: "anthropic-native.messages.create";
  readonly args: {
    readonly model: string;
    readonly maxTokens: number;
    readonly messages: readonly AnthropicNativeMessage[];
    readonly system?: string;
    readonly tools?: readonly unknown[];
    readonly toolChoice?: unknown;
    readonly credentialName?: string;
    readonly apiKey?: string;
  };
}

export interface ComputerScreenshotToolRequest {
  readonly name: "computer.screenshot";
  readonly args: Record<string, never>;
}

export interface ComputerClickToolRequest {
  readonly name: "computer.click";
  readonly args: {
    readonly target: string;
    readonly systemLevel?: boolean;
    readonly confirmed?: boolean;
  };
}

export interface ComputerTypeToolRequest {
  readonly name: "computer.type";
  readonly args: {
    readonly text: string;
    readonly target?: string;
    readonly systemLevel?: boolean;
    readonly passwordField?: boolean;
    readonly confirmed?: boolean;
  };
}

export interface ComputerScrollToolRequest {
  readonly name: "computer.scroll";
  readonly args: {
    readonly direction: "up" | "down" | "left" | "right";
    readonly amount?: number;
  };
}

export interface ComputerListWindowsToolRequest {
  readonly name: "computer.list_windows";
  readonly args: Record<string, never>;
}

export interface ComputerFocusWindowToolRequest {
  readonly name: "computer.focus_window";
  readonly args: {
    readonly windowId: string;
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
  | McpToolRequest
  | AnthropicNativeMessagesCreateToolRequest
  | ComputerScreenshotToolRequest
  | ComputerClickToolRequest
  | ComputerTypeToolRequest
  | ComputerScrollToolRequest
  | ComputerListWindowsToolRequest
  | ComputerFocusWindowToolRequest;

export interface ProcessToolResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface DockerProcessCommand {
  readonly args: readonly string[];
}

export type DockerProcessRunner = (command: DockerProcessCommand) => Promise<ProcessToolResult> | ProcessToolResult;

export interface DockerTerminalAdapterOptions {
  readonly image?: string;
  readonly workspaceRoot?: string;
  readonly network?: "none" | "bridge" | "host";
  readonly runner?: DockerProcessRunner;
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

export interface ComputerUseAdapter {
  readonly screenshot?: () => Promise<unknown>;
  readonly click?: (request: ComputerClickToolRequest["args"]) => Promise<unknown>;
  readonly type?: (request: ComputerTypeToolRequest["args"]) => Promise<unknown>;
  readonly scroll?: (request: ComputerScrollToolRequest["args"]) => Promise<unknown>;
  readonly listWindows?: () => Promise<unknown>;
  readonly focusWindow?: (request: ComputerFocusWindowToolRequest["args"]) => Promise<unknown>;
}

export interface AnthropicNativeAdapter {
  readonly createMessage: (request: AnthropicNativeMessagesCreateToolRequest["args"]) => Promise<unknown>;
}

export interface ExternalToolAdapters {
  readonly fetch?: (request: Request) => Promise<Response>;
  readonly searchWeb?: (query: string) => Promise<readonly WebSearchResult[]>;
  readonly files?: FileToolAdapter;
  readonly runTerminal?: (command: string) => Promise<ProcessToolResult>;
  readonly executeCode?: (request: CodeToolRequest["args"]) => Promise<ProcessToolResult>;
  readonly callMcp?: (request: McpToolRequest["args"]) => Promise<unknown>;
  readonly anthropicNative?: AnthropicNativeAdapter;
  readonly computer?: ComputerUseAdapter;
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

function collapseWhitespace(text: string): string {
  let output = "";
  let pendingSpace = false;
  for (const char of text) {
    if (/\s/.test(char)) {
      pendingSpace = output.length > 0;
      continue;
    }
    if (pendingSpace) {
      output += " ";
      pendingSpace = false;
    }
    output += char;
  }
  return output;
}

function isHtmlTagStart(html: string, index: number): boolean {
  const next = html[index + 1];
  if (next === undefined) {
    return false;
  }
  if (next === "/" || next === "!" || next === "?") {
    return true;
  }
  const code = next.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function skipElementContent(html: string, index: number, tagName: "script" | "style"): number {
  const lower = html.toLowerCase();
  const closing = lower.indexOf(`</${tagName}`, index);
  if (closing === -1) {
    return html.length;
  }
  const closeEnd = html.indexOf(">", closing);
  return closeEnd === -1 ? html.length : closeEnd + 1;
}

function readableText(html: string): string {
  let output = "";
  for (let index = 0; index < html.length; index += 1) {
    const char = html[index];
    if (char !== "<" || !isHtmlTagStart(html, index)) {
      output += char;
      continue;
    }

    const tagEnd = html.indexOf(">", index + 1);
    if (tagEnd === -1) {
      output += char;
      continue;
    }

    const tagName = html
      .slice(index + 1, tagEnd)
      .trimStart()
      .replace(/^\//, "")
      .split(/\s+/, 1)[0]
      ?.toLowerCase();
    output += " ";
    if (tagName === "script" || tagName === "style") {
      index = skipElementContent(html, tagEnd + 1, tagName) - 1;
      continue;
    }
    index = tagEnd;
  }

  return collapseWhitespace(output).trim();
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "ENOENT"
  );
}

function realpathIfPresent(path: string): string | undefined {
  try {
    return realpathSync(path);
  } catch (error) {
    if (isFileNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

function realAllowlist(allowlist: readonly string[]): readonly string[] {
  return allowlist.map((entry) => realpathIfPresent(entry) ?? resolve(entry));
}

function isInsideResolvedAllowlist(resolvedPath: string, allowlist: readonly string[]): boolean {
  return allowlist.some((entry) => {
    const distance = relative(entry, resolvedPath);
    return distance === "" || (distance.length > 0 && !distance.startsWith("..") && !isAbsolute(distance));
  });
}

export function createAllowlistedFileAdapter(options: AllowlistedFileAdapterOptions): FileToolAdapter {
  const requestedAllowlist = options.allowlist.map((entry) => resolve(entry));
  const allowlist = realAllowlist(options.allowlist);

  function assertResolvedAllowed(path: string): void {
    if (!isInsideResolvedAllowlist(path, allowlist)) {
      throw new Error("File path is outside the configured allowlist");
    }
  }

  function assertRequestedAllowed(path: string): void {
    if (!isInsideResolvedAllowlist(resolve(path), requestedAllowlist)) {
      throw new Error("File path is outside the configured allowlist");
    }
  }

  function allowedExistingPath(path: string): string {
    const resolvedPath = realpathIfPresent(path);
    if (resolvedPath === undefined) {
      assertRequestedAllowed(path);
      throw new Error("File does not exist");
    }
    assertResolvedAllowed(resolvedPath);
    return resolvedPath;
  }

  function allowedWritePath(path: string): string {
    const existingPath = realpathIfPresent(path);
    if (existingPath !== undefined) {
      assertResolvedAllowed(existingPath);
      return existingPath;
    }

    mkdirSync(dirname(path), { recursive: true });
    const parentPath = realpathSync(dirname(path));
    const resolvedPath = resolve(parentPath, basename(path));
    assertResolvedAllowed(resolvedPath);
    return resolvedPath;
  }

  return {
    async read(path) {
      return readFileSync(allowedExistingPath(path), "utf8");
    },
    async write(path, content) {
      writeFileSync(allowedWritePath(path), content, "utf8");
    },
    async edit(path, search, replace) {
      const resolvedPath = allowedExistingPath(path);
      const current = readFileSync(resolvedPath, "utf8");
      const replacements = current.split(search).length - 1;
      writeFileSync(resolvedPath, current.split(search).join(replace), "utf8");
      return { replacements };
    },
  };
}

function runDockerProcess(command: DockerProcessCommand): ProcessToolResult {
  const result = Bun.spawnSync(["docker", ...command.args], { stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
  };
}

export function createDockerTerminalAdapter(
  options: DockerTerminalAdapterOptions = {},
): NonNullable<ExternalToolAdapters["runTerminal"]> {
  const image = options.image ?? "alpine:3.20";
  const network = options.network ?? "none";
  const runner = options.runner ?? runDockerProcess;

  return async (command) => {
    const workspaceArgs =
      options.workspaceRoot === undefined
        ? []
        : ["-v", `${resolve(options.workspaceRoot)}:/workspace`, "-w", "/workspace"];
    return runner({
      args: ["run", "--rm", "--network", network, ...workspaceArgs, image, "sh", "-lc", command],
    });
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

  if (request.name === "anthropic-native.messages.create") {
    const createMessage = adapters.anthropicNative?.createMessage;
    if (createMessage === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => createMessage(request.args));
  }

  if (request.name === "computer.screenshot") {
    const screenshot = adapters.computer?.screenshot;
    if (screenshot === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => screenshot());
  }

  if (request.name === "computer.click") {
    const click = adapters.computer?.click;
    if (click === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => click(request.args));
  }

  if (request.name === "computer.type") {
    const type = adapters.computer?.type;
    if (type === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => type(request.args));
  }

  if (request.name === "computer.scroll") {
    const scroll = adapters.computer?.scroll;
    if (scroll === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => scroll(request.args));
  }

  if (request.name === "computer.list_windows") {
    const listWindows = adapters.computer?.listWindows;
    if (listWindows === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => listWindows());
  }

  if (request.name === "computer.focus_window") {
    const focusWindow = adapters.computer?.focusWindow;
    if (focusWindow === undefined) {
      return missingAdapter(request.name);
    }
    return attempt(() => focusWindow(request.args));
  }

  const callMcp = adapters.callMcp;
  if (callMcp === undefined) {
    return missingAdapter(request.name);
  }
  return attempt(() => callMcp(request.args));
}
