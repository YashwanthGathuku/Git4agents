/*
 * Cloudflare Worker entrypoint wrapper.
 *
 * The core router remains src/worker/index.ts. `/mcp` is the only route
 * intercepted here; MCP tool calls are delegated back through core.fetch so
 * they keep exactly the same authentication and authority checks as REST.
 */
import * as core from "./index.ts";
import { handleMcp } from "./mcp.ts";

export * from "./index.ts";

export async function fetch(
	request: Request,
	env: Parameters<typeof core.fetch>[1],
): Promise<Response> {
	const url = new URL(request.url);
	if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
		return handleMcp(request, (inner) => core.fetch(inner, env));
	}
	return core.fetch(request, env);
}
