import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
	buildLinkStatement, buildPromotionAuthority, buildTestResultStatement,
	buildVerificationResultStatement, signEnvelope, type PromotionBundle,
} from "../src/lib/attestation.ts";
import { canonicalJson, sha256Hex } from "../src/lib/canonical.ts";
import { LEDGER_GENESIS_PREV_HASH, ledgerEntryHash } from "../src/lib/ledger.ts";
import { buildPermitId } from "../src/lib/permit.ts";
import { createEd25519Signer, verifyOnlySigner } from "../src/lib/signer-node.ts";
import { admitRelease, buildReleaseStatement, type ReleaseBuildPredicate } from "../src/lib/release-admission.ts";

const REPO = "test/checkout";
const COMMIT = "a".repeat(40);
const BASE = "b".repeat(40);
const ARTIFACT = Buffer.from("unit-test artifact bytes; not a deployed application\n");

/** Synthetic signed evidence exercises admission only, not the build/eval runner. */
async function fixture(testResult: "PASS" | "FAIL" = "PASS") {
	const authority = createEd25519Signer();
	const builder = createEd25519Signer();
	const tree = await sha256Hex("test source tree");
	const policy = await sha256Hex("test policy");
	const artifactSha256 = await sha256Hex(ARTIFACT.toString());
	const permitId = await buildPermitId({ task_hash: "task", baseline_commit: BASE,
		winning_tree_sha256: tree, evaluation_bundle_hash: "evaluation", selector_policy_hash: policy,
		expected_destination_head: BASE }, sha256Hex);
	const fields = { seq: 0, ts: "2026-10-23T15:00:00Z", kind: "promotion_succeeded",
		payload_hash: await sha256Hex(canonicalJson({ permit_id: permitId, tree_sha256: tree })),
		prev_hash: LEDGER_GENESIS_PREV_HASH };
	const entry = { ...fields, entry_hash: await ledgerEntryHash(fields, sha256Hex) };
	const statements = await Promise.all([
		buildLinkStatement({ baselineCommit: BASE, candidateCommit: COMMIT, treeSha256: tree }),
		buildTestResultStatement({ treeSha256: tree, candidateCommit: COMMIT, testConfigDigest: "checks", result: testResult }),
		buildVerificationResultStatement({ treeSha256: tree, candidateCommit: COMMIT, policySha256: policy, result: "PASSED" }),
		buildPromotionAuthority({ taskHash: "task", baselineCommit: BASE, candidateRepo: "test/fork",
			candidateCommit: COMMIT, treeSha256: tree, evaluationBundleHash: "evaluation", verificationResult: "PASSED",
			policySha256: policy, destinationRepo: REPO, destinationBase: BASE, nonce: "nonce", permitId,
			issuedAt: fields.ts, ledgerHeadSha256: entry.entry_hash }),
	]);
	const promotion: PromotionBundle = { version: 3, statements: await Promise.all(statements.map((s) => signEnvelope(s, authority))),
		ship: { repo: REPO, commit: COMMIT, tree_sha256: tree, base: BASE, parent: BASE, permit_id: permitId },
		ledger: { entries: [entry], head_sha256: entry.entry_hash }, authority_pubkey_der_hex: authority.publicKeyDerHex };
	const predicate: ReleaseBuildPredicate = { source: { repo: REPO, commit: COMMIT, tree_sha256: tree },
		promotion_bundle_sha256: await sha256Hex(canonicalJson(promotion)), target_environment: "preview" };
	const build = await signEnvelope(buildReleaseStatement(artifactSha256, predicate), builder);
	return { authority, builder, predicate, input: { promotion, build, artifactSha256,
		trust: { repository: REPO, environment: "preview", promotedCommit: COMMIT,
			authorityKeyDerHex: authority.publicKeyDerHex, selectorPolicyHash: policy },
		authorityVerifier: verifyOnlySigner(authority.publicKeyDerHex), builderVerifier: verifyOnlySigner(builder.publicKeyDerHex) } };
}

describe("release admission", () => {
	it("admits the artifact bound to the promoted commit, evidence, repository and environment", async () => {
		const { input } = await fixture();
		const result = await admitRelease(input);
		assert.equal(result.decision, "ADMITTED");
		assert.equal(result.release?.artifact_sha256, input.artifactSha256);
		assert.equal(result.release?.commit, COMMIT);
		assert.equal(result.release?.environment, "preview");
	});
	it("refuses an artifact substituted after the trusted build", async () => {
		const { input } = await fixture();
		input.artifactSha256 = await sha256Hex("different bytes");
		const result = await admitRelease(input);
		assert.deepEqual(result.reasons, ["artifact_digest_mismatch"]);
		assert.equal(result.release, undefined);
	});
	it("refuses an otherwise valid old promotion when canonical state has advanced", async () => {
		const { input } = await fixture();
		input.trust.promotedCommit = "c".repeat(40);
		assert.ok((await admitRelease(input)).reasons.includes("stale_promoted_commit"));
	});
	it("refuses a build signed by the worker's self-selected key", async () => {
		const { input, predicate } = await fixture();
		input.build = await signEnvelope(buildReleaseStatement(input.artifactSha256, predicate), createEd25519Signer());
		assert.ok((await admitRelease(input)).reasons.includes("untrusted_build_signature"));
	});
	it("refuses another promotion authority even if the bundle embeds its own key", async () => {
		const { input } = await fixture();
		const other = createEd25519Signer();
		input.authorityVerifier = verifyOnlySigner(other.publicKeyDerHex);
		input.trust.authorityKeyDerHex = other.publicKeyDerHex;
		assert.equal((await admitRelease(input)).decision, "REFUSED");
	});
	it("refuses a different frozen policy", async () => {
		const { input } = await fixture();
		input.trust.selectorPolicyHash = await sha256Hex("other policy");
		assert.ok((await admitRelease(input)).reasons.includes("promotion:policy digest"));
	});
	it("refuses a failing test statement even when the verification statement says passed", async () => {
		const { input } = await fixture("FAIL");
		assert.ok((await admitRelease(input)).reasons.includes("required_checks_not_passed"));
	});
	it("refuses replay to a different environment", async () => {
		const { input } = await fixture();
		input.trust.environment = "production";
		assert.ok((await admitRelease(input)).reasons.includes("environment_mismatch"));
	});
	it("refuses repository relabeling in the unsigned ship record", async () => {
		const { input, predicate, builder } = await fixture();
		input.promotion.ship.repo = "other/repo";
		input.trust.repository = "other/repo";
		predicate.source.repo = "other/repo";
		predicate.promotion_bundle_sha256 = await sha256Hex(canonicalJson(input.promotion));
		input.build = await signEnvelope(buildReleaseStatement(input.artifactSha256, predicate), builder);
		assert.ok((await admitRelease(input)).reasons.includes("repository_mismatch"));
	});
	it("refuses a trusted build that used a different source revision", async () => {
		const { input, predicate, builder } = await fixture();
		predicate.source.commit = "d".repeat(40);
		input.build = await signEnvelope(buildReleaseStatement(input.artifactSha256, predicate), builder);
		assert.ok((await admitRelease(input)).reasons.includes("build_source_mismatch"));
	});
	it("refuses a build bound to another evidence bundle", async () => {
		const { input, predicate, builder } = await fixture();
		predicate.promotion_bundle_sha256 = await sha256Hex("other evidence");
		input.build = await signEnvelope(buildReleaseStatement(input.artifactSha256, predicate), builder);
		assert.ok((await admitRelease(input)).reasons.includes("promotion_evidence_mismatch"));
	});
	it("refuses a tampered promotion payload", async () => {
		const { input } = await fixture();
		input.promotion.statements[0].payload += " ";
		assert.equal((await admitRelease(input)).decision, "REFUSED");
	});
	it("fails closed on malformed JSON shapes and missing configuration", async () => {
		const { input } = await fixture();
		assert.equal((await admitRelease({ ...input, promotion: null as unknown as PromotionBundle })).decision, "REFUSED");
		assert.equal((await admitRelease({ ...input, build: { ...input.build, payload: "null" } })).decision, "REFUSED");
		assert.deepEqual((await admitRelease({ ...input, trust: { ...input.trust, environment: "" } })).reasons, ["missing_trusted_configuration"]);
		assert.deepEqual((await admitRelease({ ...input, artifactSha256: "not-a-digest" })).reasons, ["invalid_artifact_digest"]);
	});
	it("freezes the expected revision before asynchronous verification", async () => {
		const { input } = await fixture();
		const original = input.authorityVerifier;
		input.authorityVerifier = { ...original, async verify(...args) {
			input.trust.promotedCommit = "e".repeat(40);
			return original.verify(...args);
		} };
		assert.equal((await admitRelease(input)).decision, "ADMITTED");
	});
	it("CLI hashes actual file bytes and refuses the file after tampering", async () => {
		const { input, builder } = await fixture();
		const dir = mkdtempSync(path.join(tmpdir(), "release-admission-test-"));
		try {
			writeFileSync(path.join(dir, "artifact.bin"), ARTIFACT);
			writeFileSync(path.join(dir, "promotion.json"), JSON.stringify(input.promotion));
			writeFileSync(path.join(dir, "build.json"), JSON.stringify(input.build));
			writeFileSync(path.join(dir, "authority.pub"), input.trust.authorityKeyDerHex);
			writeFileSync(path.join(dir, "builder.pub"), builder.publicKeyDerHex);
			const config = path.join(dir, "config.json");
			writeFileSync(config, JSON.stringify({ promotionBundle: "promotion.json", buildAttestation: "build.json",
				artifact: "artifact.bin", authorityPublicKey: "authority.pub", builderPublicKey: "builder.pub", ...input.trust }));
			const cli = fileURLToPath(new URL("../src/cli/admit-release.ts", import.meta.url));
			const run = () => spawnSync(process.execPath, [cli, "--config", config], { encoding: "utf8" });
			const accepted = run();
			assert.equal(accepted.status, 0, accepted.stderr);
			assert.equal(JSON.parse(accepted.stdout).decision, "ADMITTED");
			writeFileSync(path.join(dir, "artifact.bin"), "changed after build");
			const refused = run();
			assert.equal(refused.status, 1, refused.stderr);
			assert.deepEqual(JSON.parse(refused.stdout).reasons, ["artifact_digest_mismatch"]);
		} finally { rmSync(dir, { recursive: true, force: true }); }
	});
});
