/**
 * What the control plane records for one fork-crew run, in the order the
 * authority must receive it (specs/amendments/governed-resolution-v1.md).
 *
 *   COMPOSED          [COMPOSED (+ witness_check when witnesses are declared)]
 *   SEMANTIC_CONFLICT nothing: the text merged cleanly, but a frozen witness
 *                     shows a side's intent did not survive the merge
 *   CONFLICTED        [CONFLICTED] (no resolver configured)
 *   RESOLVED          [CONFLICTED, RESOLVED (+ resolution bound to the capsule)]
 *   REVIEW            [CONFLICTED]; nothing is admitted until a person either
 *                     clears an unwitnessed candidate or supplies a resolver
 *
 * A REVIEW can be cleared (reviewClearedBy) only for a candidate whose witness
 * verdict is REVIEW — a side had no discriminating witness, which is an
 * ambiguity a person may settle. A REFUSE verdict, or replay orders that
 * disagree, is never cleared here: a person answers it with a resolver command,
 * whose output is gated again.
 */

import { spawnSync } from "node:child_process";

import { buildConflictCapsuleV2 } from "../../src/lib/conflict-capsule.ts";
import { minimalEnv } from "./child-env.mjs";
import { authorityComposition } from "./fork-crew.mjs";
import {
	REPLAYER_ENV_NAMES,
	findMergiraf,
	resolutionRecord,
	resolveWithCommand,
	resolveWithLadder,
	sameLeasedText,
} from "./resolve-ladder.mjs";
import { witnessReport } from "./witness.mjs";

/**
 * @typedef {import("./witness.mjs").LoadedWitnesses} LoadedWitnesses
 * @typedef {ReturnType<typeof import("./witness.mjs").freezeWitnesses>} FrozenWitnesses
 */

/**
 * @param {string} repo
 * @param {any} crewRun the result of runCrewOnFork
 * @param {{
 *   taskHash: string,
 *   contenderId: string,
 *   witnesses: LoadedWitnesses | null,
 *   frozen: FrozenWitnesses | null,
 *   mode: "none" | "ladder" | "command",
 *   command?: string | null,
 *   replayer?: string | null,
 *   replayerId?: string,
 *   replayerEnv?: Record<string, string | undefined>,
 *   mergiraf?: string | null | "auto",
 *   requiredSides?: string[],
 *   reviewClearedBy?: string | null,
 *   timeoutMs?: number,
 * }} opts
 */
export async function governCrewResult(repo, crewRun, opts) {
	const manifestSha = opts.witnesses?.sha256 ?? null;
	/**
	 * @param {"COMPOSED" | "CONFLICTED" | "RESOLVED"} status
	 * @param {string | null} sha
	 * @param {{ resolution?: any, witness_check?: any }} [extra]
	 */
	const record = (status, sha, extra = {}) =>
		authorityComposition({
			status,
			baseline: crewRun.baseline,
			commits: crewRun.commits,
			conflict: crewRun.conflict,
			sha,
			contender_id: opts.contenderId,
			witness_manifest_sha256: manifestSha,
			...extra,
		});

	if (crewRun.status === "COMPOSED") {
		if (!opts.witnesses || !opts.frozen) {
			return { status: /** @type {const} */ ("COMPOSED"), candidateSha: crewRun.sha, compositions: [record("COMPOSED", crewRun.sha)], witness: null };
		}
		const witness = witnessReport(repo, crewRun.sha, opts.witnesses, opts.frozen, {
			requiredSides: opts.requiredSides ?? [],
			timeoutMs: opts.timeoutMs,
		});
		if (witness.verdict === "REFUSE") {
			resetMain(repo, crewRun.baseline);
			return {
				status: /** @type {const} */ ("SEMANTIC_CONFLICT"),
				candidateSha: null,
				compositions: [],
				witness,
				detail: `the crew's edits merged cleanly as text, but ${witness.report.reasons.join("; ")}`,
			};
		}
		if (witness.verdict === "REVIEW" && !opts.reviewClearedBy) {
			resetMain(repo, crewRun.baseline);
			return { status: /** @type {const} */ ("REVIEW"), candidateSha: null, compositions: [], witness, detail: witness.report.reasons.join("; ") };
		}
		const witness_check = {
			witness_manifest_sha256: manifestSha,
			witness_report_sha256: witness.sha256,
			verdict: witness.verdict,
			review_cleared_by: witness.verdict === "REVIEW" ? opts.reviewClearedBy ?? null : null,
		};
		return {
			status: /** @type {const} */ ("COMPOSED"),
			candidateSha: crewRun.sha,
			compositions: [record("COMPOSED", crewRun.sha, { witness_check })],
			witness,
		};
	}

	if (crewRun.status !== "CONFLICTED") throw new Error(`governCrewResult: unexpected crew status ${crewRun.status}`);
	const conflicted = record("CONFLICTED", null);
	const capsule = await buildConflictCapsuleV2(opts.taskHash, /** @type {any} */ (conflicted));
	const conflictedRecord = { ...conflicted, capsule_id: capsule.capsule_id };
	if (opts.mode === "none") {
		return { status: /** @type {const} */ ("CONFLICTED"), candidateSha: null, compositions: [conflictedRecord], capsule };
	}

	const ladderOpts = { witnesses: opts.witnesses, frozen: opts.frozen, capsuleId: capsule.capsule_id, timeoutMs: opts.timeoutMs };
	let result;
	if (opts.mode === "command") {
		if (!opts.command) throw new Error("governCrewResult: command mode needs a resolver command");
		result = resolveWithCommand(repo, crewRun, opts.command, ladderOpts);
	} else {
		/** @type {Record<string, string | undefined>} */
		const replayerEnv = {};
		for (const name of REPLAYER_ENV_NAMES) replayerEnv[name] = opts.replayerEnv?.[name];
		result = resolveWithLadder(repo, crewRun, {
			...ladderOpts,
			mergiraf: opts.mergiraf === "auto" || opts.mergiraf === undefined ? findMergiraf() : opts.mergiraf,
			replayer: opts.replayer ?? null,
			replayerId: opts.replayerId,
			replayerEnv,
		});
	}

	if (result.status === "REVIEW") {
		const clearable = clearableCandidate(repo, result.candidates);
		if (!opts.reviewClearedBy || !clearable) {
			return { status: /** @type {const} */ ("REVIEW"), candidateSha: null, compositions: [conflictedRecord], capsule, review: result };
		}
		resetMain(repo, clearable.candidate.sha);
		const resolution = resolutionRecord(
			{ ...clearable.candidate, order_agreement: clearable.agreement },
			{ capsuleId: capsule.capsule_id, witnessManifestSha256: manifestSha, reviewClearedBy: opts.reviewClearedBy },
		);
		const clearedSha = clearable.candidate.sha;
		return {
			status: /** @type {const} */ ("RESOLVED"),
			candidateSha: clearedSha,
			compositions: [conflictedRecord, record("RESOLVED", clearedSha, { resolution })],
			capsule,
			review: result,
		};
	}

	const resolution = resolutionRecord(result, { capsuleId: capsule.capsule_id, witnessManifestSha256: manifestSha });
	return {
		status: /** @type {const} */ ("RESOLVED"),
		candidateSha: result.sha,
		compositions: [conflictedRecord, record("RESOLVED", result.sha, { resolution })],
		capsule,
		ladder: result,
	};
}

/**
 * The REVIEW candidate a person may clear, and how its replay orders agreed.
 * A structured or command candidate with a REVIEW verdict is clearable. A
 * replay candidate is clearable only when both orders produced it
 * byte-for-byte: without witnesses, identical text is the only evidence that
 * the orders agree.
 *
 * @param {string} repo
 * @param {Array<{ sha: string, rung: string, order: string | null, resolver_id: string, lease: { paths: string[], precomposed_tree: string }, witness: { verdict: string, sha256: string, report: any } }>} candidates
 */
function clearableCandidate(repo, candidates) {
	const reviewable = candidates.filter((c) => c.witness.verdict === "REVIEW");
	const single = reviewable.find((c) => c.rung !== "replay");
	if (single) return { candidate: single, agreement: /** @type {null} */ (null) };
	const ab = reviewable.find((c) => c.rung === "replay" && c.order === "AB");
	const ba = reviewable.find((c) => c.rung === "replay" && c.order === "BA");
	if (ab && ba && sameLeasedText(repo, ab.sha, ba.sha, ab.lease.paths)) {
		return { candidate: ab, agreement: /** @type {const} */ ("identical") };
	}
	return null;
}

/**
 * @param {string} repo
 * @param {string} sha
 */
function resetMain(repo, sha) {
	spawnSync("git", ["checkout", "-B", "main", sha], { cwd: repo, env: minimalEnv() });
	spawnSync("git", ["reset", "--hard", sha], { cwd: repo, env: minimalEnv() });
	spawnSync("git", ["clean", "-fd"], { cwd: repo, env: minimalEnv() });
}
