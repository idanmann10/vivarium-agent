export interface ToolDispatchRequest {
  readonly name: string;
  readonly args: unknown;
}

export function dispatchTool(request: ToolDispatchRequest): string {
  return `queued:${request.name}`;
}
