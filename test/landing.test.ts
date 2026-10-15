/** GET /, GET /health, and the optional public demo work graph. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeHarness, worker } from "./helpers/worker-harness.ts";

describe("public landing routes", () => {
	it("GET / is an HTML page and GET /health is 200 JSON", async () => {
		const h = await makeHarness();
		const home = await worker.fetch(new Request("https://madgrix.test/"), h.env as any);
		assert.equal(home.status, 200);
		assert.match(home.headers.get("content-type") ?? "", /text\/html/);
		const text = await home.text();
		assert.match(text, /Git4agents/);
		assert.match(text, /github\.com\/YashwanthGathuku\/Git4agents/);
		const health = await worker.fetch(new Request("https://madgrix.test/health"), h.env as any);
		assert.equal(health.status, 200);
		assert.deepEqual(await health.json(), { ok: true, service: "madgrix", protocol: "git4agents" });
	});

	it("the work graph needs a token unless the task is the configured public demo", async () => {
		const h = await makeHarness();
		const url = `https://madgrix.test/tasks/${h.taskId}/graph`;
		assert.equal((await worker.fetch(new Request(url), h.env as any)).status, 401);
		const env = { ...h.env, MADGRIX_PUBLIC_DEMO_TASK_ID: h.taskId };
		const page = await worker.fetch(new Request(url), env as any);
		assert.equal(page.status, 200);
		assert.match(page.headers.get("content-type") ?? "", /text\/html/);
		const other = await worker.fetch(new Request("https://madgrix.test/tasks/other-task/graph"), env as any);
		assert.equal(other.status, 401);
	});
});
