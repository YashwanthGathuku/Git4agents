/**
 * Hostile-audit authority regressions (docs/FINAL_HOSTILE_AUDIT.md).
 * These call the real transitions. They do not stub the refusal.
 *
 * node --test test/final-authority-invariants.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, sha256Hex } from "../src/lib/canonical.ts";
import { assumeCompleteMergeArtifactScan } from "../src/lib/merge-artifacts.ts";
import { authorityRefusal } from "../src/lib/authority-refusal.ts";
import { promotableCompositionSha } from "../src/lib/composition-authority.ts";
import { createEd25519Signer } from "../src/lib/signer-node.ts";
import {
	attemptPromotion,
	createAuthority,
	ingestQueueEvent,
	issuePermit,
	quarantineContender,
	recordComposition,
	registerOperatorKeys,
	reviewQuarantine,
	runVerdictSeam,
	submitEvaluation,
	type Ctx,
	type Effect,
	type QuarantineRecheck,
	type SignedDetermination,
} from "../src/lib/task-state.ts";
import type { AuthorityState, CompositionRecord, EvaluationBundle, PermitRecord, QueuePushEvent } from "../src/lib/types.ts";
import { quarantineDeterminationPayload } from "../src/lib/verifier-keys.ts";
import { buildWorkGraph } from "../src/lib/work-graph.ts";
import { worker } from "./helpers/worker-harness.ts";

const BASELINE = "base123";
const OLD = "old-sha";
const CANDIDATE = "composed-sha";
const REPUBLISH = "empty-republish-sha";
const RESOLVED = "resolved-sha";
const SIDE_A = "side-a-sha";
const SIDE_B = "side-b-sha";
const FORENSIC = "quarantine-evidence-sha";
const FRESH = "post-release-sha";

function makeCtx(): Ctx {
	return {
		now: () => "2026-10-12T12:00:00.000Z",
		randomHex: (n: number) => "a".repeat(n * 2),
		sha256Hex,
		selectorPolicyHash: "policyhash",
		policyVersion: "seam-policy/0.1.0",
	};
}

function composition(overrides: Partial<CompositionRecord> = {}): CompositionRecord {
	return {
		status: "COMPOSED",
		contender_id: "contender-1",
		baseline: BASELINE,
		agents: [
			{ id: "sub-api", role: "api", intent: "change the handler", sha: SIDE_A, paths: ["src/api.js"], claim_work_id: "W-api" },
			{ id: "sub-ui", role: "ui", intent: "change the view", sha: SIDE_B, paths: ["src/ui.js"], claim_work_id: "W-ui" },
		],
		contributing_shas: [SIDE_A, SIDE_B],
		files: [
			{
				path: "src/shared.js",
				classification: "textual-line-overlap",
				sides: [
					{ agent_id: "sub-api", role: "api", intent: "change the handler", sha: SIDE_A, excerpt: "api" },
					{ agent_id: "sub-ui", role: "ui", intent: "change the view", sha: SIDE_B, excerpt: "ui" },
				],
			},
		],
		candidate_sha: CANDIDATE,
		...overrides,
	};
}

function observed(sha: string | null): AuthorityState {
	const state = createAuthority({
		task_id: "task-1",
		task_hash: "taskhash-abc",
		intent: "compose two agents",
		baseline_repo: "acme/api",
		baseline_commit: BASELINE,
		behavior_contract: "both behaviors hold",
		policy_version: "seam-policy/0.1.0",
		frozen_at: "2026-10-12T11:00:00Z",
	});
	state.contenders["contender-1"] = {
		contender_id: "contender-1",
		agent_id: "agent-1",
		fork_repo: "fork-1",
		fork_lineage: { parent_repo: "acme/api", parent_commit: BASELINE },
		fork_base: BASELINE,
		token_id: "tok-1",
		status: "forked",
		claim_work_id: null,
		latest_commit: sha,
	};
	return state;
}

function atTip(state: AuthorityState, sha: string): AuthorityState {
	return {
		...state,
		contenders: { "contender-1": { ...state.contenders["contender-1"], latest_commit: sha } },
	};
}

async function makeBundle(overrides: Partial<EvaluationBundle> = {}): Promise<EvaluationBundle> {
	const base = {
		candidate_sha: OLD,
		tree_sha256: "tree-old",
		contender_id: "contender-1",
		task_hash: "taskhash-abc",
		admission: {
			exact_baseline: true,
			scope_compliance: true,
			valid_tool_states: true,
			no_eval_tampering: true,
			provenance_complete: true,
		},
		hidden_oracle: { passed: true, total: 2, failed: [] as string[] },
		regressions: { passed: true, total: 5, failed: [] as string[] },
		static_analysis: { passed: true, findings: [] as string[] },
		semantic_checks: { passed: true, total: 1, failed: [] as string[] },
		security_policy: { passed: true, findings: [] as string[] },
		evaluated_at: "2026-10-12T12:00:00Z",
		tainted: false,
		...overrides,
	};
	const { bundle_hash: _ignored, ...rest } = base as EvaluationBundle & { bundle_hash?: string };
	const scanned = assumeCompleteMergeArtifactScan(rest);
	return { ...(scanned as EvaluationBundle), bundle_hash: await sha256Hex(canonicalJson(scanned)) };
}

async function accepted(ctx: Ctx, sha: string, tree = "tree-old"): Promise<AuthorityState> {
	let state = observed(sha);
	state = (await submitEvaluation(state, await makeBundle({ candidate_sha: sha, tree_sha256: tree }), { zone: "evaluation_domain" }, ctx)).state;
	const seam = await runVerdictSeam(
		state,
		[{ contender_id: "contender-1", candidate_sha: sha, blast_radius: 1, change_surface: 1 }],
		ctx,
	);
	assert.equal(seam.record.state, "ACCEPT");
	assert.equal(seam.record.winner_sha, sha);
	return seam.state;
}

function noCanonicalWrite(effects: Effect[]): void {
	assert.equal(effects.some((effect) => effect.kind === "canonical_write"), false);
}

async function operatorFor(ctx: Ctx, state: AuthorityState) {
	const signer = createEd25519Signer();
	const registered = await registerOperatorKeys(state, [{ public_key_der_hex: signer.publicKeyDerHex }], ctx);
	async function determine(decision: "RELEASED" | "REVOKED", note: string): Promise<SignedDetermination> {
		const payload = new TextEncoder().encode(
			quarantineDeterminationPayload({
				contender_id: "contender-1",
				trigger: "tool_status_fabrication",
				decision,
				note,
			}),
		);
		const sig = await signer.sign(payload);
		return { note, keyid: signer.keyid, signature: sig.signature };
	}
	const recheck = (passed: boolean): QuarantineRecheck => ({
		trigger: "tool_status_fabrication",
		passed,
		detail: passed ? "re-run passes" : "re-run reproduces the finding",
		checked_at: "2026-10-12T12:00:00.000Z",
	});
	return { state: registered, determine, recheck };
}

function push(before: string, after: string, repo = "fork-1"): QueuePushEvent {
	return { namespace: "push", repo, ref: "refs/heads/work", before, after };
}

function authorityEnv(state: AuthorityState, touched: { artifacts: number; container: number }) {
	return {
		TASK_AUTHORITY: {
			idFromName: (name: string) => ({ toString: () => name }),
			get: () => ({
				fetch: async (request: Request) => {
					const url = new URL(request.url);
					assert.equal(url.pathname, "/state");
					assert.equal(request.method, "GET");
					return new Response(JSON.stringify(state), {
						status: 200,
						headers: { "content-type": "application/json" },
					});
				},
			}),
		},
		ARTIFACTS: new Proxy(
			{},
			{
				get(_target, prop) {
					if (prop === "then") return undefined;
					touched.artifacts += 1;
					throw new Error(`ARTIFACTS.${String(prop)} must not be called`);
				},
			},
		),
		PROMOTION_CONTAINER: {
			idFromName: (name: string) => ({ toString: () => name }),
			get: () => ({
				fetch: async () => {
					touched.container += 1;
					throw new Error("promotion container must not be called");
				},
			}),
		},
		PROMOTION_WORKFLOW: {},
		EVALUATION_SERVICE_TOKEN: "evaluation",
		CONTROL_SERVICE_TOKEN: "control",
		AGENT_SERVICE_TOKEN: "agent",
	};
}

async function expectRunPromotionRefusal(state: AuthorityState, permitId: string, outcome: string): Promise<void> {
	const touched = { artifacts: 0, container: 0 };
	const answer = await worker.runPromotion(authorityEnv(state, touched) as never, "task-1", permitId);
	assert.equal(answer.status, 409);
	assert.equal(answer.body.outcome, outcome);
	assert.equal(touched.artifacts, 0);
	assert.equal(touched.container, 0);
	assert.equal(state.permits[permitId].consumed, false);
}

describe("P0-1 exact composition candidate", () => {
	it("COMPOSED candidate X refuses a permit for an accepted old SHA Y", async () => {
		const ctx = makeCtx();
		let state = await accepted(ctx, OLD);
		state = await recordComposition(state, composition({ candidate_sha: CANDIDATE }), ctx);
		assert.equal(promotableCompositionSha(state.composition), CANDIDATE);
		assert.equal(buildWorkGraph(state).candidate_sha, CANDIDATE);
		assert.equal(authorityRefusal(state, "contender-1", OLD), "UNRESOLVED_CONFLICT");
		assert.equal(authorityRefusal(state, "contender-1", CANDIDATE), null);
		const permitsBefore = Object.keys(state.permits).length;
		const refused = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(refused.outcome, "UNRESOLVED_CONFLICT");
		assert.equal(refused.permit, null);
		assert.equal(Object.keys(refused.state.permits).length, permitsBefore);
		const seam = await runVerdictSeam(
			state,
			[{ contender_id: "contender-1", candidate_sha: OLD, blast_radius: 1, change_surface: 1 }],
			ctx,
		);
		assert.equal(seam.record.state, "REJECT");
		assert.equal(seam.record.winner_sha, null);
		assert.match(seam.record.reasons.join("\n"), /UNRESOLVED_CONFLICT/);
	});

	it("an existing permit for Y cannot promote once the candidate is X", async () => {
		const ctx = makeCtx();
		let state = await accepted(ctx, OLD);
		const issued = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(issued.outcome, "ISSUED");
		assert.ok(issued.permit);
		state = await recordComposition(issued.state, composition({ candidate_sha: CANDIDATE }), ctx);
		const promoted = await attemptPromotion(state, issued.permit.permit_id, BASELINE, issued.permit.winning_tree_sha256, ctx);
		assert.equal(promoted.outcome, "UNRESOLVED_CONFLICT");
		noCanonicalWrite(promoted.effects);
		assert.equal(promoted.state.permits[issued.permit.permit_id].consumed, false);
		await expectRunPromotionRefusal(state, issued.permit.permit_id, "UNRESOLVED_CONFLICT");
	});

	it("a candidate equal to a member SHA omitted from contributing_shas is rejected", async () => {
		const ctx = makeCtx();
		const omittedAgent = composition({
			candidate_sha: SIDE_A,
			contributing_shas: ["other-1", "other-2"],
			agents: [
				{ id: "sub-api", role: "api", intent: "change the handler", sha: SIDE_A, paths: ["src/api.js"], claim_work_id: "W-api" },
				{ id: "sub-ui", role: "ui", intent: "change the view", sha: "other-2", paths: ["src/ui.js"], claim_work_id: "W-ui" },
			],
		});
		await assert.rejects(recordComposition(observed(SIDE_A), omittedAgent, ctx), /contributing SHA/);
		const omittedSide = composition({
			candidate_sha: "side-only",
			contributing_shas: ["other-1", "other-2"],
			agents: [
				{ id: "sub-api", role: "api", intent: "change the handler", sha: "other-1", paths: ["src/api.js"], claim_work_id: "W-api" },
				{ id: "sub-ui", role: "ui", intent: "change the view", sha: "other-2", paths: ["src/ui.js"], claim_work_id: "W-ui" },
			],
			files: [
				{
					path: "src/shared.js",
					classification: "textual-line-overlap",
					sides: [
						{ agent_id: "sub-api", role: "api", intent: "change the handler", sha: "side-only", excerpt: "a" },
						{ agent_id: "sub-ui", role: "ui", intent: "change the view", sha: "other-2", excerpt: "b" },
					],
				},
			],
		});
		await assert.rejects(recordComposition(observed("side-only"), omittedSide, ctx), /contributing SHA/);
	});

	it("a stored member SHA that skipped normalization is still not promotable", async () => {
		const ctx = makeCtx();
		let state = await accepted(ctx, SIDE_A);
		const issued = await issuePermit(state, SIDE_A, "acme/api", BASELINE, ctx);
		assert.equal(issued.outcome, "ISSUED");
		assert.ok(issued.permit);
		state = {
			...issued.state,
			composition: composition({
				candidate_sha: SIDE_A,
				contributing_shas: ["other-1", "other-2"],
			}),
		};
		assert.equal(promotableCompositionSha(state.composition), null);
		assert.equal(buildWorkGraph(state).candidate_sha, null);
		const refused = await issuePermit(state, SIDE_A, "acme/api", BASELINE, ctx);
		assert.equal(refused.outcome, "UNRESOLVED_CONFLICT");
		assert.equal(refused.permit, null);
		const promoted = await attemptPromotion(state, issued.permit.permit_id, BASELINE, issued.permit.winning_tree_sha256, ctx);
		assert.equal(promoted.outcome, "UNRESOLVED_CONFLICT");
		noCanonicalWrite(promoted.effects);
		assert.equal(promoted.state.permits[issued.permit.permit_id].consumed, false);
	});

	it("an old SHA gets no permit after a new composition, and a republish cannot replace the bound candidate", async () => {
		const ctx = makeCtx();
		let bound = await accepted(ctx, OLD);
		bound = await recordComposition(bound, composition({ status: "COMPOSED", candidate_sha: REPUBLISH }), ctx);
		const oldPermit = await issuePermit(bound, OLD, "acme/api", BASELINE, ctx);
		assert.equal(oldPermit.outcome, "UNRESOLVED_CONFLICT");
		assert.equal(oldPermit.permit, null);
		await assert.rejects(
			recordComposition(bound, composition({ status: "COMPOSED", candidate_sha: CANDIDATE }), ctx),
			/already bound/,
		);

		let fixed = await recordComposition(observed(CANDIDATE), composition({ candidate_sha: CANDIDATE }), ctx);
		fixed = atTip(fixed, REPUBLISH);
		await assert.rejects(
			submitEvaluation(fixed, await makeBundle({ candidate_sha: REPUBLISH, tree_sha256: "tree-repub" }), { zone: "evaluation_domain" }, ctx),
			/not the composition candidate/,
		);
		await assert.rejects(
			submitEvaluation(fixed, await makeBundle({ candidate_sha: OLD }), { zone: "evaluation_domain" }, ctx),
			/not the composition candidate/,
		);
		const arbitrary = await issuePermit(await accepted(ctx, "arbitrary-sha"), "arbitrary-sha", "acme/api", BASELINE, ctx);
		assert.equal(arbitrary.outcome, "ISSUED");
		assert.ok(arbitrary.permit);
		const withComposition = await recordComposition(arbitrary.state, composition({ candidate_sha: CANDIDATE }), ctx);
		const refusedArbitrary = await attemptPromotion(
			withComposition,
			arbitrary.permit.permit_id,
			BASELINE,
			arbitrary.permit.winning_tree_sha256,
			ctx,
		);
		assert.equal(refusedArbitrary.outcome, "UNRESOLVED_CONFLICT");
		noCanonicalWrite(refusedArbitrary.effects);
	});

	it("CONFLICTED admits no evaluation, permit, or promotion", async () => {
		const ctx = makeCtx();
		let state = await accepted(ctx, OLD);
		const issued = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(issued.outcome, "ISSUED");
		assert.ok(issued.permit);
		state = await recordComposition(issued.state, composition({ status: "CONFLICTED", candidate_sha: null }), ctx);
		assert.equal(promotableCompositionSha(state.composition), null);
		await assert.rejects(
			submitEvaluation(state, await makeBundle({ candidate_sha: OLD }), { zone: "evaluation_domain" }, ctx),
			/CONFLICTED/,
		);
		const refused = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(refused.outcome, "UNRESOLVED_CONFLICT");
		assert.equal(refused.permit, null);
		const seam = await runVerdictSeam(
			state,
			[{ contender_id: "contender-1", candidate_sha: OLD, blast_radius: 1, change_surface: 1 }],
			ctx,
		);
		assert.notEqual(seam.record.state, "ACCEPT");
		assert.equal(seam.record.winner_sha, null);
		const promoted = await attemptPromotion(state, issued.permit.permit_id, BASELINE, issued.permit.winning_tree_sha256, ctx);
		assert.equal(promoted.outcome, "UNRESOLVED_CONFLICT");
		noCanonicalWrite(promoted.effects);
		assert.equal(promoted.state.permits[issued.permit.permit_id].consumed, false);
		for (const status of ["PENDING", "COMPOSING", "RESOLVING"] as const) {
			const input =
				status === "RESOLVING"
					? composition({ status, candidate_sha: null })
					: composition({ status, candidate_sha: null, contributing_shas: [], agents: [], files: [] });
			const open = await recordComposition(await accepted(ctx, OLD), input, ctx);
			assert.equal(promotableCompositionSha(open.composition), null);
			const openPermit = await issuePermit(open, OLD, "acme/api", BASELINE, ctx);
			assert.equal(openPermit.outcome, "UNRESOLVED_CONFLICT");
			assert.equal(openPermit.permit, null);
		}
	});

	it("RESOLVED admits only the resolver SHA", async () => {
		const ctx = makeCtx();
		let state = await accepted(ctx, OLD);
		state = await recordComposition(state, composition({ status: "RESOLVED", candidate_sha: RESOLVED }), ctx);
		assert.equal(buildWorkGraph(state).candidate_sha, RESOLVED);
		const oldPermit = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(oldPermit.outcome, "UNRESOLVED_CONFLICT");
		assert.equal(oldPermit.permit, null);
		await assert.rejects(
			submitEvaluation(atTip(state, SIDE_A), await makeBundle({ candidate_sha: SIDE_A }), { zone: "evaluation_domain" }, ctx),
			/contributing SHA/,
		);
		const ready = atTip(state, RESOLVED);
		const recorded = await submitEvaluation(
			ready,
			await makeBundle({ candidate_sha: RESOLVED, tree_sha256: "tree-resolved" }),
			{ zone: "evaluation_domain" },
			ctx,
		);
		assert.equal(recorded.outcome, "RECORDED");
		const seam = await runVerdictSeam(
			recorded.state,
			[
				{ contender_id: "contender-1", candidate_sha: OLD, blast_radius: 1, change_surface: 1 },
				{ contender_id: "contender-1", candidate_sha: RESOLVED, blast_radius: 1, change_surface: 1 },
			],
			ctx,
		);
		assert.equal(seam.record.state, "ACCEPT");
		assert.equal(seam.record.winner_sha, RESOLVED);
		assert.match(seam.record.reasons.join("\n"), /OLD|old-sha/);
		const permit = await issuePermit(seam.state, RESOLVED, "acme/api", BASELINE, ctx);
		assert.equal(permit.outcome, "ISSUED");
		assert.equal(permit.permit?.winner_candidate_sha, RESOLVED);
	});

	it("the exact candidate X is evaluated, permitted, and promoted", async () => {
		const ctx = makeCtx();
		let state = await recordComposition(observed(CANDIDATE), composition({ candidate_sha: CANDIDATE }), ctx);
		const bundle = await makeBundle({ candidate_sha: CANDIDATE, tree_sha256: "tree-candidate" });
		state = (await submitEvaluation(state, bundle, { zone: "evaluation_domain" }, ctx)).state;
		const seam = await runVerdictSeam(
			state,
			[{ contender_id: "contender-1", candidate_sha: CANDIDATE, blast_radius: 1, change_surface: 1 }],
			ctx,
		);
		assert.equal(seam.record.state, "ACCEPT");
		assert.equal(seam.record.winner_sha, CANDIDATE);
		const issued = await issuePermit(seam.state, CANDIDATE, "acme/api", BASELINE, ctx);
		assert.equal(issued.outcome, "ISSUED");
		assert.ok(issued.permit);
		const promoted = await attemptPromotion(issued.state, issued.permit.permit_id, BASELINE, "tree-candidate", ctx);
		assert.equal(promoted.outcome, "PROMOTED");
		assert.equal(promoted.effects.some((effect) => effect.kind === "canonical_write" && effect.commit === CANDIDATE), true);
	});
});

describe("P0-2 and P1-2 quarantine epoch", () => {
	async function permitted(ctx: Ctx): Promise<{ state: AuthorityState; permit: PermitRecord }> {
		const state = await accepted(ctx, OLD);
		const issued = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(issued.outcome, "ISSUED");
		assert.ok(issued.permit);
		return { state: issued.state, permit: issued.permit };
	}

	it("QUARANTINED stores forensic evidence and refuses permit and promotion", async () => {
		const ctx = makeCtx();
		const { state: permittedState, permit } = await permitted(ctx);
		const quarantined = await quarantineContender(permittedState, "contender-1", "tool_status_fabrication", "ev-1", ctx);
		let state = quarantined.state;
		assert.ok(state.quarantine["contender-1"].blocked_candidate_shas?.includes(OLD));
		assert.ok(state.quarantine["contender-1"].voided_permit_ids?.includes(permit.permit_id));
		const again = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(again.outcome, "QUARANTINED_CANDIDATE");
		assert.equal(again.permit, null);
		const promoted = await attemptPromotion(state, permit.permit_id, BASELINE, permit.winning_tree_sha256, ctx);
		assert.equal(promoted.outcome, "QUARANTINED_CANDIDATE");
		noCanonicalWrite(promoted.effects);
		assert.equal(promoted.state.permits[permit.permit_id].consumed, false);
		await expectRunPromotionRefusal(state, permit.permit_id, "QUARANTINED_CANDIDATE");

		const pushed = await ingestQueueEvent(state, push(OLD, FORENSIC), ctx);
		assert.equal(pushed.outcome, "APPLIED_NEW");
		const forensic = await submitEvaluation(
			pushed.state,
			await makeBundle({ candidate_sha: FORENSIC, tree_sha256: "tree-forensic" }),
			{ zone: "evaluation_domain" },
			ctx,
		);
		assert.equal(forensic.outcome, "RECORDED");
		assert.deepEqual(forensic.effects, []);
		assert.equal(forensic.state.evaluations[FORENSIC].tainted, true);
		assert.ok(forensic.state.quarantine["contender-1"].blocked_candidate_shas?.includes(FORENSIC));
		assert.equal(forensic.state.ledger.at(-1)?.kind, "evaluation_recorded_forensic");
		assert.equal(forensic.state.quarantine["contender-1"].evidence_hash, "ev-1");
		const seam = await runVerdictSeam(
			forensic.state,
			[{ contender_id: "contender-1", candidate_sha: FORENSIC, blast_radius: 1, change_surface: 1 }],
			ctx,
		);
		assert.notEqual(seam.record.state, "ACCEPT");
		assert.equal(seam.record.winner_sha, null);
	});

	it("REVOKED never promotes, and quarantine evidence stays unselectable", async () => {
		const ctx = makeCtx();
		const { state: permittedState, permit } = await permitted(ctx);
		let state = (await quarantineContender(permittedState, "contender-1", "tool_status_fabrication", "ev-1", ctx)).state;
		const pushed = await ingestQueueEvent(state, push(OLD, FORENSIC), ctx);
		state = (
			await submitEvaluation(
				pushed.state,
				await makeBundle({ candidate_sha: FORENSIC, tree_sha256: "tree-forensic" }),
				{ zone: "evaluation_domain" },
				ctx,
			)
		).state;
		const operator = await operatorFor(ctx, state);
		const revoked = await reviewQuarantine(
			operator.state,
			"contender-1",
			"REVOKED",
			operator.recheck(false),
			await operator.determine("REVOKED", "the mechanical finding reproduced"),
			ctx,
		);
		state = revoked.state;
		assert.equal(state.quarantine["contender-1"].status, "REVOKED");
		assert.equal(state.evaluations[FORENSIC].tainted, true);
		assert.equal(state.evaluations[OLD].tainted, true);
		await assert.rejects(
			submitEvaluation(atTip(state, FRESH), await makeBundle({ candidate_sha: FRESH, tree_sha256: "tree-fresh" }), { zone: "evaluation_domain" }, ctx),
			/REVOKED/,
		);
		const seam = await runVerdictSeam(
			state,
			[{ contender_id: "contender-1", candidate_sha: FORENSIC, blast_radius: 1, change_surface: 1 }],
			ctx,
		);
		assert.notEqual(seam.record.state, "ACCEPT");
		assert.equal(seam.record.winner_sha, null);
		const permitAttempt = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(permitAttempt.outcome, "REVOKED_CANDIDATE");
		assert.equal(permitAttempt.permit, null);
		const promoted = await attemptPromotion(state, permit.permit_id, BASELINE, permit.winning_tree_sha256, ctx);
		assert.equal(promoted.outcome, "REVOKED_CANDIDATE");
		noCanonicalWrite(promoted.effects);
		assert.equal(promoted.state.permits[permit.permit_id].consumed, false);
		assert.notEqual(promoted.state.task_status, "promoted");
		await expectRunPromotionRefusal(state, permit.permit_id, "REVOKED_CANDIDATE");
	});

	it("RELEASED rejects the old permit and the old ACCEPT, and a new SHA can promote", async () => {
		const ctx = makeCtx();
		const { state: permittedState, permit } = await permitted(ctx);
		let state = (await quarantineContender(permittedState, "contender-1", "tool_status_fabrication", "ev-1", ctx)).state;
		const during = await ingestQueueEvent(state, push(OLD, FORENSIC), ctx);
		state = (
			await submitEvaluation(
				during.state,
				await makeBundle({ candidate_sha: FORENSIC, tree_sha256: "tree-forensic" }),
				{ zone: "evaluation_domain" },
				ctx,
			)
		).state;
		const operator = await operatorFor(ctx, state);
		const released = await reviewQuarantine(
			operator.state,
			"contender-1",
			"RELEASED",
			operator.recheck(true),
			await operator.determine("RELEASED", "re-verification shows a mechanical false positive"),
			ctx,
		);
		state = released.state;
		assert.equal(state.quarantine["contender-1"].status, "RELEASED");
		assert.equal(state.evaluations[OLD].tainted, true);
		assert.equal(state.evaluations[FORENSIC].tainted, true);
		assert.ok(state.quarantine["contender-1"].voided_permit_ids?.includes(permit.permit_id));
		assert.ok(state.quarantine["contender-1"].blocked_candidate_shas?.includes(OLD));
		assert.ok(state.quarantine["contender-1"].blocked_candidate_shas?.includes(FORENSIC));

		const oldPermit = await attemptPromotion(state, permit.permit_id, BASELINE, permit.winning_tree_sha256, ctx);
		assert.equal(oldPermit.outcome, "AUTHORITY_EPOCH");
		noCanonicalWrite(oldPermit.effects);
		assert.equal(oldPermit.state.permits[permit.permit_id].consumed, false);
		await expectRunPromotionRefusal(state, permit.permit_id, "AUTHORITY_EPOCH");
		const minted = await issuePermit(state, OLD, "acme/api", BASELINE, ctx);
		assert.equal(minted.outcome, "AUTHORITY_EPOCH");
		assert.equal(minted.permit, null);
		await assert.rejects(
			submitEvaluation(atTip(state, FORENSIC), await makeBundle({ candidate_sha: FORENSIC, tree_sha256: "tree-forensic-2" }), { zone: "evaluation_domain" }, ctx),
			/salvage requires a new SHA/,
		);

		const pushed = await ingestQueueEvent(atTip(state, FORENSIC), push(FORENSIC, FRESH), ctx);
		assert.equal(pushed.outcome, "APPLIED_NEW");
		assert.equal(pushed.state.contenders["contender-1"].latest_commit, FRESH);
		const recorded = await submitEvaluation(
			pushed.state,
			await makeBundle({ candidate_sha: FRESH, tree_sha256: "tree-fresh" }),
			{ zone: "evaluation_domain" },
			ctx,
		);
		assert.equal(recorded.outcome, "RECORDED");
		assert.equal(recorded.state.evaluations[FRESH].tainted, false);
		const seam = await runVerdictSeam(
			recorded.state,
			[{ contender_id: "contender-1", candidate_sha: FRESH, blast_radius: 1, change_surface: 1 }],
			ctx,
		);
		assert.equal(seam.record.state, "ACCEPT");
		assert.equal(seam.record.winner_sha, FRESH);
		const freshPermit = await issuePermit(seam.state, FRESH, "acme/api", BASELINE, ctx);
		assert.equal(freshPermit.outcome, "ISSUED");
		assert.ok(freshPermit.permit);
		assert.equal(freshPermit.permit.winner_candidate_sha, FRESH);
		const promoted = await attemptPromotion(freshPermit.state, freshPermit.permit.permit_id, BASELINE, "tree-fresh", ctx);
		assert.equal(promoted.outcome, "PROMOTED");
		assert.equal(promoted.effects.some((effect) => effect.kind === "canonical_write" && effect.commit === FRESH), true);
		const revived = await attemptPromotion(promoted.state, permit.permit_id, BASELINE, permit.winning_tree_sha256, ctx);
		assert.equal(revived.outcome, "AUTHORITY_EPOCH");
		noCanonicalWrite(revived.effects);
		assert.equal(revived.state.permits[permit.permit_id].consumed, false);
	});
});

describe("P1-1 causal queue tip", () => {
	it("advances only from the observed tip and does not rewind", async () => {
		const ctx = makeCtx();
		const start = observed(null);
		const toB = await ingestQueueEvent(start, push(BASELINE, "sha-b"), ctx);
		assert.equal(toB.outcome, "APPLIED_NEW");
		assert.equal(toB.state.contenders["contender-1"].latest_commit, "sha-b");
		const toC = await ingestQueueEvent(toB.state, push("sha-b", "sha-c"), ctx);
		assert.equal(toC.outcome, "APPLIED_NEW");
		assert.equal(toC.state.contenders["contender-1"].latest_commit, "sha-c");

		const again = await ingestQueueEvent(toC.state, push(BASELINE, "sha-b"), ctx);
		assert.equal(again.outcome, "ACK_DUP");
		assert.equal(again.state, toC.state);
		assert.equal(again.state.contenders["contender-1"].latest_commit, "sha-c");
		assert.deepEqual(again.effects, []);

		const stale = await ingestQueueEvent(toC.state, push("unrelated-before", "unrelated-after"), ctx);
		assert.equal(stale.outcome, "REQUIRES_RECONCILIATION");
		assert.equal(stale.state.contenders["contender-1"].latest_commit, "sha-c");
		assert.equal(stale.state.ledger.at(-1)?.kind, "queue_event_requires_reconciliation");
		assert.deepEqual(stale.effects, []);

		const observedAgain = await ingestQueueEvent(stale.state, push("somewhere-else", "sha-c"), ctx);
		assert.equal(observedAgain.outcome, "ALREADY_OBSERVED");
		assert.equal(observedAgain.state.contenders["contender-1"].latest_commit, "sha-c");

		const next = await ingestQueueEvent(observedAgain.state, push("sha-c", "sha-d"), ctx);
		assert.equal(next.outcome, "APPLIED_NEW");
		assert.equal(next.state.contenders["contender-1"].latest_commit, "sha-d");

		const unknown = await ingestQueueEvent(next.state, push("sha-d", "sha-e", "someone-elses-fork"), ctx);
		assert.equal(unknown.outcome, "REJECTED_UNKNOWN_REPO");
		assert.equal(unknown.state.contenders["contender-1"].latest_commit, "sha-d");
		assert.equal(unknown.state.ledger.at(-1)?.kind, "queue_event_rejected_unknown_repo");

		const gap = await ingestQueueEvent(observed(null), push("not-the-base", "sha-z"), ctx);
		assert.equal(gap.outcome, "REQUIRES_RECONCILIATION");
		assert.equal(gap.state.contenders["contender-1"].latest_commit, null);

		const noTip = observed(null);
		noTip.contenders["contender-1"] = { ...noTip.contenders["contender-1"], fork_base: "", latest_commit: null };
		const unplaced = await ingestQueueEvent(noTip, push("anything", "sha-z"), ctx);
		assert.equal(unplaced.outcome, "REQUIRES_RECONCILIATION");
		assert.equal(unplaced.state.contenders["contender-1"].latest_commit, null);
	});

	it("the queue consumer acknowledges a reconciliation and does not throw", async () => {
		for (const outcome of ["ACK_DUP", "APPLIED_NEW", "ALREADY_OBSERVED", "REQUIRES_RECONCILIATION", "REJECTED_UNKNOWN_REPO"]) {
			await worker.queue(
				{
					messages: [
						{
							body: {
								task_id: "task-1",
								event: push(BASELINE, "sha-b"),
							},
						},
					],
				},
				{
					TASK_AUTHORITY: {
						idFromName: (name: string) => ({ toString: () => name }),
						get: () => ({
							fetch: async () =>
								new Response(JSON.stringify({ outcome, effects: [], event_key: "k" }), {
									status: 200,
									headers: { "content-type": "application/json" },
								}),
						}),
					},
					ARTIFACTS: {},
					PROMOTION_WORKFLOW: {},
				} as never,
			);
		}
		await assert.rejects(
			worker.queue(
				{ messages: [{ body: { task_id: "task-1", event: push(BASELINE, "sha-b") } }] },
				{
					TASK_AUTHORITY: {
						idFromName: (name: string) => ({ toString: () => name }),
						get: () => ({
							fetch: async () =>
								new Response(JSON.stringify({ outcome: "APPLIED_BACKWARD", effects: [] }), {
									status: 200,
									headers: { "content-type": "application/json" },
								}),
						}),
					},
					ARTIFACTS: {},
					PROMOTION_WORKFLOW: {},
				} as never,
			),
			/unexpected outcome/,
		);
	});
});
