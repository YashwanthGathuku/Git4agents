/**
 * The one composition rule for evaluation, verdict, permit, and promotion
 * (specs/amendments/composition-result-v1.md,
 * specs/amendments/exact-composition-candidate-v1.md).
 *
 * A task with a composition record has at most one promotable SHA:
 * composition.candidate_sha, and only while the status is COMPOSED or
 * RESOLVED, and only when that SHA is not a crew contribution. Every other
 * SHA is refused, including an older accepted SHA, a republish, and a member
 * SHA that contributing_shas omitted.
 */

import type { AuthorityState, CompositionRecord } from "./types.ts";

function addSha(into: Set<string>, sha: unknown): void {
	if (typeof sha === "string" && sha.length > 0) into.add(sha);
}

/**
 * Every crew contribution SHA: contributing_shas, each agent sha, and each
 * conflict-side sha. Omission from contributing_shas does not drop an agent
 * or side SHA.
 */
export function compositionMemberShas(composition: {
	contributing_shas?: unknown;
	agents?: unknown;
	files?: unknown;
}): string[] {
	const shas = new Set<string>();
	if (Array.isArray(composition.contributing_shas)) {
		for (const sha of composition.contributing_shas) addSha(shas, sha);
	}
	if (Array.isArray(composition.agents)) {
		for (const agent of composition.agents) {
			if (agent && typeof agent === "object") addSha(shas, (agent as { sha?: unknown }).sha);
		}
	}
	if (Array.isArray(composition.files)) {
		for (const file of composition.files) {
			if (!file || typeof file !== "object") continue;
			const sides = (file as { sides?: unknown }).sides;
			if (!Array.isArray(sides)) continue;
			for (const side of sides) {
				if (side && typeof side === "object") addSha(shas, (side as { sha?: unknown }).sha);
			}
		}
	}
	return [...shas];
}

/** The one SHA promotion may use, or null when this record names none. */
export function promotableCompositionSha(composition: CompositionRecord | null | undefined): string | null {
	if (!composition) return null;
	if (composition.status !== "COMPOSED" && composition.status !== "RESOLVED") return null;
	const sha = composition.candidate_sha;
	if (typeof sha !== "string" || sha.length === 0) return null;
	if (compositionMemberShas(composition).includes(sha)) return null;
	return sha;
}

/**
 * True when this contender's composition record forbids `sha`.
 * No record for this contender → false. A promotable record forbids every
 * SHA except that exact candidate. Every other status forbids every SHA.
 */
export function compositionBlocks(state: AuthorityState, contenderId: string, sha?: string): boolean {
	const composition = state.composition;
	if (!composition || composition.contender_id !== contenderId) return false;
	const promotable = promotableCompositionSha(composition);
	if (promotable === null) return true;
	return sha !== promotable;
}

/** The submitEvaluation error for a blocked SHA, or null when it is allowed. */
export function compositionEvidenceError(state: AuthorityState, contenderId: string, sha: string): string | null {
	if (!compositionBlocks(state, contenderId, sha)) return null;
	const composition = state.composition;
	const promotable =
		composition && composition.contender_id === contenderId ? promotableCompositionSha(composition) : null;
	if (promotable === null) {
		const status = composition?.status;
		if (status === "COMPOSED" || status === "RESOLVED") {
			return (
				`evaluation rejected: contender ${contenderId} has no promotable candidate ` +
				`(${sha} is not a new composition SHA)`
			);
		}
		return (
			`evaluation rejected: contender ${contenderId} is ${status ?? "CONFLICTED"} — ` +
			"an unresolved composition is not a candidate"
		);
	}
	if (composition && compositionMemberShas(composition).includes(sha)) {
		return (
			`evaluation rejected: ${sha} is a contributing SHA, not the composition candidate ${promotable}`
		);
	}
	return `evaluation rejected: ${sha} is not the composition candidate ${promotable}`;
}
