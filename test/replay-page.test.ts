/**
 * GET /replay serves a self-contained page built from the recorded live run.
 * node --test test/replay-page.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./helpers/worker-harness.ts";
import { LIVE_RUN } from "../src/worker/replay-data.ts";
import { LIVE_BEATS, SIM_BEATS, renderReplayPage } from "../src/worker/replay-page.ts";

// worker-harness maps cloudflare:workers to a stub before the Worker loads.
const { fetch: entryFetch } = await import("../src/worker/entrypoint.ts");
const env = {} as Parameters<typeof entryFetch>[1];

describe("GET /replay", () => {
	it("answers 200 HTML with a restrictive CSP", async () => {
		const res = await entryFetch(new Request("https://madgrix.test/replay"), env);
		assert.equal(res.status, 200);
		assert.match(res.headers.get("content-type") ?? "", /text\/html/);
		assert.match(res.headers.get("content-security-policy") ?? "", /default-src 'none'/);
		const html = await res.text();
		assert.match(html, /Git4agents/);
		assert.match(html, /SIMULATED FROM TEST HARNESS/);
	});

	it("loads nothing from another origin", () => {
		const html = renderReplayPage();
		assert.doesNotMatch(html, /<script[^>]+src=/i);
		assert.doesNotMatch(html, /<link[^>]+href=/i);
		assert.doesNotMatch(html, /@import|url\(\s*["']?https?:/i);
	});

	it("embeds the real ledger of the verified live run, unchanged and chained", () => {
		const bundle = JSON.parse(readFileSync(new URL("../src/worker/replay-data.ts", import.meta.url), "utf8").replace(/^[\s\S]*?export const LIVE_RUN = /, "").replace(/ as const;\s*$/, ""));
		assert.deepEqual(bundle, LIVE_RUN);
		assert.equal(LIVE_RUN.ship.commit, "fc9c1e7084ad14067012a56e68bd8f4c5bdc85c2");
		assert.equal(LIVE_RUN.ledger.length, 25);
		for (let k = 1; k < LIVE_RUN.ledger.length; k++) assert.equal(LIVE_RUN.ledger[k].prev_hash, LIVE_RUN.ledger[k - 1].entry_hash);
		assert.equal(LIVE_RUN.ledger.at(-1)!.kind, "promotion_succeeded");
		assert.equal(LIVE_RUN.verify.at(-1), "VERIFIED");
		const html = renderReplayPage();
		for (const e of LIVE_RUN.ledger) assert.ok(html.includes(e.entry_hash), `ledger entry ${e.seq} on the page`);
	});

	it("references only ledger entries that exist, and keeps credentials off the page", () => {
		const seqs = new Set<number>(LIVE_RUN.ledger.map((e) => e.seq));
		for (const b of LIVE_BEATS) for (const s of b.seqs ?? []) assert.ok(seqs.has(s), `seq ${s}`);
		assert.ok(SIM_BEATS.some((b) => b.title === "QUARANTINED"));
		assert.ok(SIM_BEATS.some((b) => /FALSIFIED/.test(b.title)));
		const html = renderReplayPage();
		assert.doesNotMatch(html, /bearer|secret|password|"sig"|"token"/i);
	});

	it("is linked from the landing page", async () => {
		const res = await entryFetch(new Request("https://madgrix.test/"), env);
		assert.equal(res.status, 200);
		assert.match(await res.text(), /href="\/replay"/);
	});
});
