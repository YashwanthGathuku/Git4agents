// Re-run the resolution benchmark and check that every attempt has the same
// outcome as the committed results (timings and commit ids are allowed to
// differ). Exit 1 on any difference. Used by the reviewer-image workflow.
//
//   node scripts/bench/check-outcomes.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RESULTS = "bench/resolution/results/results.json";

/** @param {{rows: Array<Record<string, unknown>>}} r */
const outcomes = (r) =>
	new Map(r.rows.map((row) => [`${row.scenario}/${row.strategy}/${row.pipeline}`, `${row.outcome}|${row.admitted}|${row.acceptance}`]));

const committed = outcomes(JSON.parse(execFileSync("git", ["show", `HEAD:${RESULTS}`], { encoding: "utf8" })));
const run = spawnSync(process.execPath, ["scripts/bench-resolution.mjs"], { stdio: "inherit" });
if (run.status !== 0) process.exit(run.status ?? 1);
const fresh = outcomes(JSON.parse(readFileSync(RESULTS, "utf8")));

const diffs = [];
for (const [key, want] of committed) {
	const got = fresh.get(key);
	if (got !== want) diffs.push(`${key}: committed ${want}, now ${got ?? "missing"}`);
}
for (const key of fresh.keys()) if (!committed.has(key)) diffs.push(`${key}: not in the committed results`);

if (diffs.length) {
	console.error(`[check] ${diffs.length} attempt(s) differ from the committed results:\n${diffs.join("\n")}`);
	process.exit(1);
}
console.log(`[check] all ${committed.size} attempts match the committed outcomes`);
