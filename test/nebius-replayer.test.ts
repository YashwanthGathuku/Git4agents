import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, it } from "node:test";
import { callModel, parseResolution } from "../scripts/resolvers/llm-replayer.mjs";

// Mock transport tests only: no claim that a live NVIDIA model was called.
const settings = { LLM_PROVIDER: "nebius", LLM_MODEL: "nvidia/test-model", NEBIUS_API_KEY: "fixture-key" };
const completion = (message: unknown, finish_reason = "stop") => ({ choices: [{ message, finish_reason }] });
const response = (body: unknown, status = 200): typeof fetch => async () =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Nebius Token Factory replayer", () => {
	it("sends the configured model and returns only final answer text over HTTP", async () => {
		let observed: { url?: string; authorization?: string; body: any } | undefined;
		const answer = "<resolution>export const total = 42;</resolution>";
		const server = createServer(async (req, res) => {
			let raw = "";
			for await (const chunk of req) raw += chunk;
			observed = { url: req.url, authorization: req.headers.authorization, body: JSON.parse(raw) };
			res.setHeader("content-type", "application/json");
			res.end(JSON.stringify(completion({ content: answer, reasoning_content: "Private reasoning is not a patch" })));
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		try {
			const port = (server.address() as { port: number }).port;
			const result = await callModel("preserve both changes", { ...settings, LLM_BASE_URL: `http://127.0.0.1:${port}/v1/` });
			assert.equal(result, answer);
			assert.equal(parseResolution(result, { base: "old\n", target: { text: "new\n" } }), "export const total = 42;\n");
			assert.ok(observed);
			assert.equal(observed.url, "/v1/chat/completions");
			assert.equal(observed.authorization, "Bearer fixture-key");
			assert.equal(observed.body.model, settings.LLM_MODEL);
			assert.equal(observed.body.stream, false);
			assert.equal(observed.body.messages[0].role, "system");
			assert.deepEqual(observed.body.messages[1], { role: "user", content: "preserve both changes" });
		} finally {
			server.closeAllConnections();
			await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		}
	});

	it("uses Token Factory by default and bounds request time", async () => {
		const transport: typeof fetch = async (url, options) => {
			assert.equal(url, "https://api.tokenfactory.nebius.com/v1/chat/completions");
			assert.ok(options?.signal instanceof AbortSignal);
			return new Response(JSON.stringify(completion({ content: "<resolution>ok</resolution>" })));
		};
		await callModel("x", settings, transport);
	});

	it("requires explicit credentials and model without making a network call", async () => {
		const noNetwork: typeof fetch = async () => { throw new Error("unexpected network call"); };
		await assert.rejects(callModel("x", { ...settings, NEBIUS_API_KEY: "" }, noNetwork), /NEBIUS_API_KEY is required/);
		await assert.rejects(callModel("x", { ...settings, LLM_MODEL: "" }, noNetwork), /LLM_MODEL is required/);
	});

	it("refuses truncated output even when it contains a resolution block", async () => {
		await assert.rejects(callModel("x", settings, response(completion({ content: "<resolution>partial</resolution>" }, "length"))), /did not finish normally/);
	});

	it("refuses reasoning-only, empty, malformed, and tool-call responses", async () => {
		for (const body of [
			completion({ reasoning_content: "<resolution>not an answer</resolution>" }),
			completion({ content: " " }), completion({ content: [] }),
			completion({ content: "<resolution>x</resolution>" }, "tool_calls"), null, {},
		]) await assert.rejects(callModel("x", settings, response(body)), /Nebius completion/);
	});

	it("reports HTTP failures without echoing provider payloads or retrying", async () => {
		await assert.rejects(callModel("x", settings, response({ error: "sensitive provider payload" }, 429)),
			(error: Error) => error.message === "model call failed: HTTP 429");
	});
});
