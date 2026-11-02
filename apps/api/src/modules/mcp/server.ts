import { Data, Effect } from 'effect';
import type { McpUser } from './token';
import { type McpTool, mcpTools } from './tools';

export class McpFailure extends Data.TaggedError('McpFailure')<{
  readonly cause: unknown;
}> {}

export const serveMcp = Effect.fn('Mcp.serve')(function* (
  request: Request,
  user: McpUser,
  tools: readonly McpTool[] = mcpTools,
) {
  const { McpServer } = yield* Effect.promise(
    () => import('@modelcontextprotocol/sdk/server/mcp.js'),
  );
  const { WebStandardStreamableHTTPServerTransport } = yield* Effect.promise(
    () =>
      import('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'),
  );

  const server = new McpServer({ name: 'vornway', version: '0.0.1' });
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { title: tool.title, description: tool.description, inputSchema: {} },
      async () => {
        const output = await Effect.runPromise(tool.run(user));
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      },
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  return yield* Effect.tryPromise({
    try: async () => {
      await server.connect(transport);
      return await transport.handleRequest(request);
    },
    catch: (cause) => new McpFailure({ cause }),
  });
});
