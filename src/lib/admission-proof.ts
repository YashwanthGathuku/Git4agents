/**
 * Admission proof (specs/amendments/admission-proof-v1.md).
 *
 * The authority cannot run witnesses or read git objects. When a witness
 * runner key is pinned (`Ctx.witnessRunnerPublicKey`), a COMPOSED or RESOLVED
 * record must carry `admission_proof`:
 *
 * - `commit_object`: the candidate's raw git commit object (base64). The
 *   authority recomputes its SHA-1 object id (it must equal `candidate_sha`)
 *   and reads its tree and parents: the parents must be exactly the baseline
 *   and the contributing SHAs. A made-up candidate SHA has no such object.
 * - `attestation`: when the record carries a witness verdict (RESOLVED's
 *   resolution.witness, or COMPOSED's witness_check), a payload signed by the
 *   witness runner's Ed25519 key binding task, contender, baseline,
 *   contributing SHAs, candidate SHA and tree, capsule, manifest, report digest
 *   and verdict. A forged report digest or verdict without the runner key fails.
 *
 * Without a pinned key the authority behaves as before (no proof checked).
 */
import { canonicalJson } from "./canonical.ts";

export const WITNESS_ATTESTATION_FORMAT = "madgrix-witness-attestation/v1";

export interface WitnessAttestationPayload {
	format: typeof WITNESS_ATTESTATION_FORMAT;
	task_hash: string;
	contender_id: string;
	baseline: string;
	contributing_shas: string[];
	candidate_sha: string;
	candidate_tree: string;
	capsule_id: string | null;
	witness_manifest_sha256: string | null;
	witness_report_sha256: string;
	verdict: "ADMIT" | "REVIEW";
	review_cleared_by: string | null;
}

export interface AdmissionProof {
	/** Raw git commit object body, base64. */
	commit_object: string;
	attestation?: { payload: WitnessAttestationPayload; signature: string } | null;
}

const enc = new TextEncoder();

export function attestationBytes(payload: WitnessAttestationPayload): Uint8Array {
	return enc.encode(canonicalJson(payload));
}

function fromBase64(text: string): Uint8Array {
	const bin = atob(text);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
	return out;
}

function hex(bytes: ArrayBuffer): string {
	return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(text: string): Uint8Array {
	if (!/^(?:[0-9a-f]{2})+$/i.test(text)) throw new Error("not hex");
	const out = new Uint8Array(text.length / 2);
	for (let i = 0; i < out.length; i += 1) out[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
	return out;
}

/** Git object id (SHA-1) of a commit object body. */
export async function gitCommitId(body: Uint8Array): Promise<string> {
	const header = enc.encode(`commit ${body.length}\0`);
	const full = new Uint8Array(header.length + body.length);
	full.set(header, 0);
	full.set(body, header.length);
	return hex(await crypto.subtle.digest("SHA-1", full as unknown as BufferSource));
}

/** Tree and parents from a commit object body (header lines only). */
export function parseCommitObject(body: Uint8Array): { tree: string; parents: string[] } {
	const text = new TextDecoder().decode(body);
	const end = text.indexOf("\n\n");
	const head = (end === -1 ? text : text.slice(0, end)).split("\n");
	let tree = "";
	const parents: string[] = [];
	for (const line of head) {
		if (line.startsWith("tree ")) tree = line.slice(5);
		else if (line.startsWith("parent ")) parents.push(line.slice(7));
	}
	if (!/^[0-9a-f]{40}$/.test(tree)) throw new Error("admission proof: commit object has no tree");
	return { tree, parents };
}

export async function verifyEd25519(publicKeySpkiHex: string, payload: Uint8Array, signatureBase64: string): Promise<boolean> {
	try {
		const key = await crypto.subtle.importKey("spki", fromHex(publicKeySpkiHex) as unknown as BufferSource, { name: "Ed25519" }, false, ["verify"]);
		return await crypto.subtle.verify({ name: "Ed25519" }, key, fromBase64(signatureBase64) as unknown as BufferSource, payload as unknown as BufferSource);
	} catch {
		return false;
	}
}

export interface AdmissionExpectation {
	task_hash: string;
	contender_id: string;
	baseline: string;
	contributing_shas: string[];
	candidate_sha: string;
	capsule_id: string | null;
	witness_manifest_sha256: string | null;
	/** The verdict the record claims, or null when it carries none. */
	witness: { witness_report_sha256: string; verdict: string; review_cleared_by: string | null } | null;
}

/** Throws unless `raw` proves `expected` under `publicKeySpkiHex`. */
export async function verifyAdmissionProof(raw: unknown, expected: AdmissionExpectation, publicKeySpkiHex: string): Promise<void> {
	if (typeof raw !== "object" || raw === null) throw new Error("recordComposition: a pinned witness runner key requires an admission_proof");
	const proof = raw as AdmissionProof;
	if (typeof proof.commit_object !== "string" || proof.commit_object === "") {
		throw new Error("recordComposition: admission_proof has no commit object");
	}
	let body: Uint8Array;
	try {
		body = fromBase64(proof.commit_object);
	} catch {
		throw new Error("recordComposition: admission_proof commit object is not base64");
	}
	if ((await gitCommitId(body)) !== expected.candidate_sha) {
		throw new Error("recordComposition: admission_proof commit object is not the candidate SHA");
	}
	const commit = parseCommitObject(body);
	const want = [expected.baseline, ...expected.contributing_shas].sort();
	if (canonicalJson([...commit.parents].sort()) !== canonicalJson(want)) {
		throw new Error("recordComposition: the candidate commit's parents are not the baseline and the contributing SHAs");
	}
	if (expected.witness === null) return;
	const att = proof.attestation;
	if (!att || typeof att.signature !== "string" || typeof att.payload !== "object" || att.payload === null) {
		throw new Error("recordComposition: a witness verdict needs a witness runner attestation");
	}
	const payload: WitnessAttestationPayload = {
		format: WITNESS_ATTESTATION_FORMAT,
		task_hash: expected.task_hash,
		contender_id: expected.contender_id,
		baseline: expected.baseline,
		contributing_shas: [...expected.contributing_shas].sort(),
		candidate_sha: expected.candidate_sha,
		candidate_tree: commit.tree,
		capsule_id: expected.capsule_id,
		witness_manifest_sha256: expected.witness_manifest_sha256,
		witness_report_sha256: expected.witness.witness_report_sha256,
		verdict: expected.witness.verdict as "ADMIT" | "REVIEW",
		review_cleared_by: expected.witness.review_cleared_by,
	};
	// The authority signs-checks ITS view of the record, not the payload the
	// caller sent: any field that differs fails the signature.
	if (!(await verifyEd25519(publicKeySpkiHex, attestationBytes(payload), att.signature))) {
		throw new Error("recordComposition: the witness attestation does not verify under the pinned witness runner key");
	}
}
