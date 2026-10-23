/**
 * Admission check between a promoted source revision and a deployable artifact.
 * This is NOT a deployment service or a single-use deployment permit. A trusted
 * deployer must still compare-and-swap its current release, enforce expiry and
 * idempotency, and deploy the exact bytes whose digest it supplied here.
 *
 * Pins and expected state come from the control plane, never from agent output.
 * The trusted builder must measure the artifact and sign only after building the
 * specified source in isolation. A signature authenticates that builder's claim;
 * it does not independently prove that its build process was correct.
 */
import {
	AGENT_PROMOTION_AUTHORITY_V1,
	TEST_RESULT_PREDICATE_TYPE,
	verifyBundle,
	verifyEnvelope,
	type AgentPromotionAuthorityPredicate,
	type DsseEnvelope,
	type InTotoStatement,
	type PromotionBundle,
	type Signer,
} from "./attestation.ts";
import { canonicalJson, sha256Hex } from "./canonical.ts";

export const RELEASE_BUILD_V1 = "https://vibingcoding.dev/attestations/release-build/v1";

export interface ReleaseBuildPredicate {
	source: { repo: string; commit: string; tree_sha256: string };
	promotion_bundle_sha256: string;
	target_environment: string;
}

export interface ReleaseTrust {
	authorityKeyDerHex: string;
	selectorPolicyHash: string;
	/** Deployment target configured by the owner. */
	repository: string;
	environment: string;
	/** Read by the controller from canonical state, not supplied by the worker. */
	promotedCommit: string;
}

export interface ReleaseAdmission {
	decision: "ADMITTED" | "REFUSED";
	reasons: string[];
	/** Present only when every check passes. No deployment authority is granted. */
	release?: {
		repository: string;
		commit: string;
		tree_sha256: string;
		artifact_sha256: string;
		promotion_bundle_sha256: string;
		environment: string;
	};
}

/** The builder signs this statement with its own pinned key. */
export function buildReleaseStatement(
	artifactSha256: string,
	predicate: ReleaseBuildPredicate,
): InTotoStatement {
	if (!/^[a-f0-9]{64}$/.test(artifactSha256)) throw new Error("invalid artifact SHA-256");
	return {
		_type: "https://in-toto.io/Statement/v1",
		subject: [{ digest: { sha256: artifactSha256 } }],
		predicateType: RELEASE_BUILD_V1,
		predicate: structuredClone(predicate),
	};
}

export async function admitRelease(input: {
	promotion: PromotionBundle;
	build: DsseEnvelope;
	/** Recomputed by the deployer from artifact bytes, never copied from a manifest. */
	artifactSha256: string;
	trust: ReleaseTrust;
	/** Verify-only signers constructed from independently configured public keys. */
	authorityVerifier: Signer;
	builderVerifier: Signer;
}): Promise<ReleaseAdmission> {
	const reasons: string[] = [];
	const refuse = (): ReleaseAdmission => ({ decision: "REFUSED", reasons });
	const trust = { ...input.trust };
	const { artifactSha256 } = input;
	if (!trust || ![trust.authorityKeyDerHex, trust.selectorPolicyHash, trust.repository,
		trust.environment, trust.promotedCommit].every((v) => typeof v === "string" && v.trim().length > 0)) {
		reasons.push("missing_trusted_configuration");
		return refuse();
	}
	if (!/^[a-f0-9]{64}$/.test(artifactSha256)) {
		reasons.push("invalid_artifact_digest");
		return refuse();
	}
	// Snapshot before asynchronous signature checks so callers cannot change what
	// was checked while verification is in flight.
	let promotion: PromotionBundle;
	let build: DsseEnvelope;
	try {
		promotion = structuredClone(input.promotion);
		build = structuredClone(input.build);
	} catch {
		reasons.push("malformed_evidence");
		return refuse();
	}
	let statements: InTotoStatement[];
	try {
		if (promotion.version !== 3) throw new Error("unsupported bundle version");
		const result = await verifyBundle(promotion, input.authorityVerifier, {
			policyHash: trust.selectorPolicyHash,
			trustedKeyDerHex: trust.authorityKeyDerHex,
		});
		if (!result.verified) {
			reasons.push(...result.lines.filter((line) => line.status === "FAIL").map((line) => `promotion:${line.label}`));
			return refuse();
		}
		statements = promotion.statements.map((envelope) => JSON.parse(envelope.payload) as InTotoStatement);
		const kinds = statements.map((statement) => statement.predicateType);
		if (new Set(kinds).size !== kinds.length) throw new Error("ambiguous statement types");
	} catch {
		reasons.push("malformed_promotion_bundle");
		return refuse();
	}
	const authority = statements.find((s) => s.predicateType === AGENT_PROMOTION_AUTHORITY_V1)?.predicate as AgentPromotionAuthorityPredicate;
	const tests = statements.find((s) => s.predicateType === TEST_RESULT_PREDICATE_TYPE)?.predicate as { result?: string } | undefined;
	if (authority?.verification?.result !== "PASSED" || tests?.result !== "PASS") reasons.push("required_checks_not_passed");
	if (authority?.destination?.repo !== trust.repository || promotion.ship.repo !== trust.repository) reasons.push("repository_mismatch");
	if (promotion.ship.commit !== trust.promotedCommit) reasons.push("stale_promoted_commit");

	let statement: InTotoStatement | undefined;
	try {
		const verified = await verifyEnvelope(build, input.builderVerifier);
		if (!verified.valid) reasons.push("untrusted_build_signature");
		else statement = verified.statement;
	} catch {
		reasons.push("malformed_build_attestation");
	}
	if (!statement) {
		if (reasons.length === 0) reasons.push("malformed_build_attestation");
		return refuse();
	}
	if (statement._type !== "https://in-toto.io/Statement/v1" || statement.predicateType !== RELEASE_BUILD_V1) {
		reasons.push("unsupported_build_statement");
		return refuse();
	}
	if (statement.subject?.length !== 1 || statement.subject[0]?.digest?.sha256 !== artifactSha256) reasons.push("artifact_digest_mismatch");
	const predicate = statement.predicate as Partial<ReleaseBuildPredicate> | null;
	if (predicate?.source?.repo !== trust.repository || predicate?.source?.commit !== promotion.ship.commit ||
		predicate?.source?.tree_sha256 !== promotion.ship.tree_sha256) reasons.push("build_source_mismatch");
	const bundleHash = await sha256Hex(canonicalJson(promotion));
	if (predicate?.promotion_bundle_sha256 !== bundleHash) reasons.push("promotion_evidence_mismatch");
	if (predicate?.target_environment !== trust.environment) reasons.push("environment_mismatch");
	if (reasons.length > 0) return refuse();
	return {
		decision: "ADMITTED",
		reasons: [],
		release: {
			repository: trust.repository,
			commit: promotion.ship.commit,
			tree_sha256: promotion.ship.tree_sha256,
			artifact_sha256: artifactSha256,
			promotion_bundle_sha256: bundleHash,
			environment: trust.environment,
		},
	};
}
