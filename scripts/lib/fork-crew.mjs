/**
 * One parent fork, role-scoped sub-agents, one combined SHA.
 *
 * Agentfleet is proprietary. This module does not vendor it and does not
 * ask it to run the sub-agents. MADGRIX checks the paired manifest itself:
 * agent ids in order, roles, and the crew's path scopes.
 * configs/git4agents-fork-crew.yaml lists parent, sub-api, and sub-ui.
 * configs/git4agents-demo-composition.yaml lists parent, sub-api, sub-ui,
 * and sub-test, in that order. `MADGRIX_FLEET_CONFIG` overrides the pair.
 * `fleet validate` runs only when `MADGRIX_FLEET_BIN` is set, as a roster
 * cross-check. An older fleet that omits summary.agent_ids fails that
 * explicit path. It does not fail the default path.
 *
 * Sub-agents do not get sibling repos. Each commits on its own worktree of the
 * parent fork, and those commands run concurrently. Disjoint edits, including
 * non-overlapping lines of one file, become one COMPOSED commit. Overlapping
 * lines are CONFLICTED: no commit is written, neither side is dropped, and the
 * result is not a candidate. A resolver may later write a new commit, which is
 * a new candidate and still has to be evaluated.
 */

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadContenderIds } from "./agentfleet-slots.mjs";
import { minimalEnv } from "./child-env.mjs";

/**
 * SHA-256 of a UTF-8 string, hex.
 * @param {string} text
 */
export function sha256Text(text) {
	return createHash("sha256").update(text, "utf8").digest("hex");
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const DEFAULT_FORK_CREW_CONFIG = path.join(repoRoot, "configs/git4agents-fork-crew.json");
export const DEFAULT_FORK_CREW_FLEET_CONFIG = path.join(repoRoot, "configs/git4agents-fork-crew.yaml");
export const DEMO_COMPOSITION_CONFIG = path.join(repoRoot, "configs/demo-composition.json");
export const DEMO_COMPOSITION_FLEET_CONFIG = path.join(repoRoot, "configs/git4agents-demo-composition.yaml");

/**
 * The manifest paired with a crew config. The demo JSON pairs with the
 * four-agent manifest. Any other crew config pairs with the three-agent
 * manifest. An explicit MADGRIX_FLEET_CONFIG still wins at the call site.
 *
 * @param {string} [crewConfig]
 * @returns {string}
 */
export function fleetConfigForCrew(crewConfig = DEFAULT_FORK_CREW_CONFIG) {
	const resolved = path.resolve(crewConfig);
	if (resolved === path.resolve(DEMO_COMPOSITION_CONFIG) || path.basename(resolved) === "demo-composition.json") {
		return DEMO_COMPOSITION_FLEET_CONFIG;
	}
	return DEFAULT_FORK_CREW_FLEET_CONFIG;
}

const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const RECORD_PATH = ".madgrix/subagent-intents.json";
const CONFLICT_PATH = ".madgrix/conflict.json";
const TOOL_STATUS_PATH = ".madgrix/tool-status.jsonl";

/**
 * Session record for the crew's tool-status log (tool-status-v1): the
 * parent contender's task, contender, agent and baseline ids. Null leaves
 * the tree's log alone (tests that do not exercise provenance).
 * @type {{ task_id: string, contender_id: string, agent_id: string, baseline_commit: string, model: string, harness: string } | null}
 */
let toolStatusSession = null;

/**
 * Set (or clear) the session record every composed/resolved commit writes.
 * @param {typeof toolStatusSession} session
 */
export function useToolStatusSession(session) {
	toolStatusSession = session;
}

/**
 * Line 1 the session, then one OK receipt per sub-agent commit (a sub-agent
 * whose command failed never reaches composition).
 * @param {NonNullable<typeof toolStatusSession>} session
 * @param {Array<{ id: string }>} commits
 * @returns {string}
 */
export function toolStatusLog(session, commits) {
	const lines = [JSON.stringify({ format: "madgrix-tool-status/v1", ...session })];
	commits.forEach((commit, i) => {
		lines.push(JSON.stringify({ seq: i + 1, action: `sub_agent:${commit.id}`, tool_status: "OK" }));
	});
	return `${lines.join("\n")}\n`;
}

/**
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
	const body = glob
		.replace(/\\/g, "/")
		.replace(/^\.\//, "")
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*/g, "\u0000")
		.replace(/\*/g, "[^/]*")
		.replace(/\u0000/g, ".*");
	return new RegExp(`^${body}$`);
}

/**
 * @param {string} file
 * @param {string[]} globs
 */
export function pathInScope(file, globs) {
	const norm = file.replace(/\\/g, "/").replace(/^\.\//, "");
	return globs.some((glob) => glob !== "**" && globToRegExp(glob).test(norm));
}

/**
 * @param {string} configPath
 */
export function loadForkCrew(configPath = DEFAULT_FORK_CREW_CONFIG) {
	/** @type {unknown} */
	let raw;
	try {
		raw = JSON.parse(readFileSync(configPath, "utf8"));
	} catch {
		throw new Error(`fork crew config is not readable JSON (${configPath})`);
	}
	if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
		throw new Error("fork crew config must be an object");
	}
	const body = /** @type {{ parent?: unknown, subs?: unknown }} */ (raw);
	const parent = asMember(body.parent, "parent");
	if (!Array.isArray(body.subs) || body.subs.length < 2) {
		throw new Error("fork crew needs a parent and at least two sub-agents");
	}
	const subs = body.subs.map((sub, i) => asSub(sub, i));
	const ids = [parent.id, ...subs.map((sub) => sub.id)];
	if (new Set(ids).size !== ids.length) throw new Error("fork crew agent ids must be distinct");
	return { parent, subs };
}

/**
 * @param {unknown} value
 * @param {string} label
 */
function asMember(value, label) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`fork crew ${label} must be an object`);
	}
	const row = /** @type {{ id?: unknown, role?: unknown, intent?: unknown }} */ (value);
	if (typeof row.id !== "string" || !AGENT_ID.test(row.id)) {
		throw new Error(`fork crew ${label} has an id Git4agents cannot enroll`);
	}
	if (typeof row.role !== "string" || row.role.length === 0) {
		throw new Error(`fork crew ${label} needs a role`);
	}
	if (typeof row.intent !== "string" || row.intent.length === 0) {
		throw new Error(`fork crew ${label} needs an intent`);
	}
	return { id: row.id, role: row.role, intent: row.intent };
}

/**
 * @param {unknown} value
 * @param {number} index
 */
function asSub(value, index) {
	const member = asMember(value, `subs[${index}]`);
	const row = /** @type {{ paths?: unknown, command?: unknown }} */ (value);
	if (!Array.isArray(row.paths) || row.paths.length === 0 || row.paths.some((p) => typeof p !== "string" || p.length === 0)) {
		throw new Error(`fork crew ${member.id} needs path globs`);
	}
	if (row.paths.includes("**")) {
		throw new Error(`fork crew ${member.id} has an unbounded path glob`);
	}
	if (typeof row.command !== "string" || row.command.length === 0) {
		throw new Error(`fork crew ${member.id} needs its own command`);
	}
	return { ...member, paths: /** @type {string[]} */ (row.paths), command: row.command };
}

/**
 * @param {{ parent: { id: string }, subs: { id: string }[] }} crew
 * @returns {string[]}
 */
export function crewAgentIds(crew) {
	return [crew.parent.id, ...crew.subs.map((sub) => sub.id)];
}

/**
 * Agent ids and roles from a manifest we ship. The file is the flat
 * `agents: - id / role` shape. This does not start Agentfleet.
 *
 * @param {string} manifestPath
 * @returns {Array<{ id: string, role: string }>}
 */
export function manifestRoster(manifestPath) {
	const text = readFileSync(manifestPath, "utf8");
	/** @type {Array<{ id: string, role: string }>} */
	const agents = [];
	let inAgents = false;
	/** @type {{ id: string, role?: string } | null} */
	let current = null;
	for (const line of text.split(/\r?\n/)) {
		if (/^agents:\s*$/.test(line)) {
			inAgents = true;
			continue;
		}
		if (!inAgents) continue;
		if (/^[A-Za-z]/.test(line)) break;
		const id = /^ {2}- id: (\S+)\s*$/.exec(line);
		if (id) {
			if (current) throw new Error(`fleet manifest ${path.basename(manifestPath)} has an agent without a role`);
			if (!AGENT_ID.test(id[1])) throw new Error(`fleet manifest has an agent id Git4agents cannot enroll`);
			current = { id: id[1] };
			continue;
		}
		const role = /^ {4}role: (\S+)\s*$/.exec(line);
		if (role && current) {
			current.role = role[1];
			agents.push({ id: current.id, role: current.role });
			current = null;
		}
	}
	if (current) throw new Error(`fleet manifest ${path.basename(manifestPath)} has an agent without a role`);
	if (agents.length < 2) throw new Error(`fleet manifest ${path.basename(manifestPath)} did not list at least two agents`);
	const seen = new Set();
	for (const agent of agents) {
		if (seen.has(agent.id)) throw new Error(`fleet manifest repeats ${agent.id}`);
		seen.add(agent.id);
	}
	return agents;
}

/**
 * The configured crew must match the paired manifest: ids in order, roles,
 * and a bounded path scope on every sub-agent. Agentfleet is not started
 * unless MADGRIX_FLEET_BIN is set. That call only cross-checks the roster.
 * It does not execute the sub-agents.
 *
 * @param {{ parent: { id: string, role: string }, subs: { id: string, role: string, paths: string[] }[] }} crew
 * @param {string} [fleetConfig]
 * @param {Record<string, string | undefined>} [env]
 */
export function assertFleetRoster(crew, fleetConfig = DEFAULT_FORK_CREW_FLEET_CONFIG, env = process.env) {
	const roster = manifestRoster(fleetConfig);
	const expected = [{ id: crew.parent.id, role: crew.parent.role }, ...crew.subs.map((sub) => ({ id: sub.id, role: sub.role }))];
	if (roster.map((agent) => `${agent.id} ${agent.role}`).join("\n") !== expected.map((agent) => `${agent.id} ${agent.role}`).join("\n")) {
		throw new Error(
			`manifest roster is ${roster.map((agent) => agent.id).join(", ")}; fork crew is ${expected.map((agent) => agent.id).join(", ")}`,
		);
	}
	for (const sub of crew.subs) {
		if (!Array.isArray(sub.paths) || sub.paths.length === 0 || sub.paths.includes("**")) {
			throw new Error(`fork crew ${sub.id} needs bounded path scopes`);
		}
	}
	const bin = env.MADGRIX_FLEET_BIN;
	if (typeof bin === "string" && bin.trim()) {
		const checked = loadContenderIds({
			env: { ...env, MADGRIX_FLEET_CONFIG: fleetConfig, MADGRIX_AGENT_IDS: undefined },
			configPath: fleetConfig,
			fleetBin: bin.trim(),
		});
		const ids = expected.map((agent) => agent.id);
		if (checked.join("\n") !== ids.join("\n")) {
			throw new Error(`fleet validate roster is ${checked.join(", ")}; fork crew is ${ids.join(", ")}`);
		}
	}
	return expected.map((agent) => agent.id);
}

/**
 * @param {string} repo
 * @param {string[]} args
 * @param {{ allowFailure?: boolean }} [opts]
 */
function git(repo, args, opts = {}) {
	const result = spawnSync("git", args, {
		cwd: repo,
		encoding: "utf8",
		env: gitEnv(),
	});
	if (result.error) throw new Error(`git ${args[0]} failed to start`);
	if ((result.status ?? 1) !== 0 && !opts.allowFailure) {
		const detail = (result.stderr || result.stdout || "").trim().split("\n")[0];
		throw new Error(`git ${args[0]} exited ${result.status}${detail ? `: ${detail}` : ""}`);
	}
	return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function gitEnv() {
	const name = process.env.GIT_AUTHOR_NAME ?? "Git4agents";
	const email = process.env.GIT_AUTHOR_EMAIL ?? "git4agents@madgrix.invalid";
	return minimalEnv({
		GIT_AUTHOR_NAME: name,
		GIT_AUTHOR_EMAIL: email,
		GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME ?? name,
		GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL ?? email,
	});
}

/**
 * @param {string} status
 * @returns {string[]}
 */
function porcelainPaths(status) {
	/** @type {string[]} */
	const files = [];
	for (const line of status.split("\n")) {
		if (!line.trim()) continue;
		const pathPart = line.slice(3).trim();
		const renamed = pathPart.split(" -> ");
		files.push(renamed[renamed.length - 1]);
	}
	return files;
}


/**
 * Text of a blob, or empty when the path does not exist at that commit.
 * @param {string} repo
 * @param {string} sha
 * @param {string} file
 */
function blobText(repo, sha, file) {
	const exists = git(repo, ["cat-file", "-e", `${sha}:${file}`], { allowFailure: true });
	if (exists.status !== 0) return "";
	return git(repo, ["show", `${sha}:${file}`]).stdout;
}

/**
 * Three-way merge of each version against the baseline. Returns the combined
 * text when changed lines do not overlap, or null when they do.
 * @param {string} repo
 * @param {string} baseline
 * @param {string} file
 * @param {Array<{ sha: string }>} group
 * @returns {string | null}
 */
function mergeDisjointEdits(repo, baseline, file, group) {
	const base = blobText(repo, baseline, file);
	let merged = blobText(repo, group[0].sha, file);
	for (let i = 1; i < group.length; i += 1) {
		const next = blobText(repo, group[i].sha, file);
		const step = threeWayMerge(base, merged, next);
		if (!step.clean) return null;
		merged = step.text;
	}
	return merged;
}

/**
 * git merge-file for disjoint crew edits. The child gets minimalEnv() only,
 * so zone tokens in the parent process are not copied into it.
 *
 * @param {string} base
 * @param {string} ours
 * @param {string} theirs
 * @param {typeof spawnSync} [spawn]
 */
export function threeWayMerge(base, ours, theirs, spawn = spawnSync) {
	const dir = mkdtempSync(path.join(os.tmpdir(), "madgrix-merge-"));
	try {
		writeFileSync(path.join(dir, "base"), base);
		writeFileSync(path.join(dir, "ours"), ours);
		writeFileSync(path.join(dir, "theirs"), theirs);
		const result = spawn("git", ["merge-file", "-p", "ours", "base", "theirs"], {
			cwd: dir,
			encoding: "utf8",
			env: minimalEnv(),
		});
		if (result.error || (result.status ?? 1) < 0) {
			throw new Error("git merge-file failed");
		}
		return { clean: result.status === 0, text: result.stdout ?? "" };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/** Conflict-marker length used when splitting a two-sided conflict into hunks. */
const HUNK_MARKER_SIZE = 32;

/**
 * @param {string} text
 * @returns {string[]} lines, each keeping its "\n"
 */
function splitLines(text) {
	return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/**
 * Split a two-sided textual conflict into hunks: the clean `segments` the
 * three-way merge settled, and between each pair of segments one `hunk`
 * holding the base, ours and theirs text of that region
 * (`segments.length === hunks.length + 1`). Interleaving the segments with any
 * choice of hunk texts rebuilds a full file.
 *
 * Returns null — the caller then leases the whole file — when the split is not
 * exact: an input already contains a line that looks like one of the markers,
 * a non-empty input lacks a final newline, or git's output does not parse.
 *
 * @param {string} base
 * @param {string} ours
 * @param {string} theirs
 * @param {typeof spawnSync} [spawn]
 * @returns {{ segments: string[], hunks: Array<{ base: string, ours: string, theirs: string }> } | null}
 */
export function conflictHunks(base, ours, theirs, spawn = spawnSync) {
	const open = "<".repeat(HUNK_MARKER_SIZE);
	const mid = "|".repeat(HUNK_MARKER_SIZE);
	const sep = "=".repeat(HUNK_MARKER_SIZE);
	const close = ">".repeat(HUNK_MARKER_SIZE);
	const markers = [open, mid, sep, close];
	for (const text of [base, ours, theirs]) {
		if (text.length > 0 && !text.endsWith("\n")) return null;
		if (splitLines(text).some((line) => markers.some((m) => line.startsWith(m)))) return null;
	}
	const dir = mkdtempSync(path.join(os.tmpdir(), "madgrix-hunks-"));
	let output = "";
	try {
		writeFileSync(path.join(dir, "base"), base);
		writeFileSync(path.join(dir, "ours"), ours);
		writeFileSync(path.join(dir, "theirs"), theirs);
		const result = spawn(
			"git",
			["merge-file", "-p", "--diff3", `--marker-size=${HUNK_MARKER_SIZE}`, "-L", "ours", "-L", "base", "-L", "theirs", "ours", "base", "theirs"],
			{ cwd: dir, encoding: "utf8", env: minimalEnv() },
		);
		if (result.error || (result.status ?? -1) < 0) return null;
		output = result.stdout ?? "";
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
	/** @param {string} line @param {string} marker */
	const is = (line, marker) => {
		const bare = line.endsWith("\n") ? line.slice(0, -1) : line;
		return bare === marker || bare.startsWith(`${marker} `);
	};
	/** @type {string[]} */
	const segments = [""];
	/** @type {Array<{ base: string, ours: string, theirs: string }>} */
	const hunks = [];
	/** @type {"clean" | "ours" | "base" | "theirs"} */
	let state = "clean";
	let current = { base: "", ours: "", theirs: "" };
	for (const line of splitLines(output)) {
		const marker = markers.find((m) => is(line, m));
		if (state === "clean") {
			if (marker === open) {
				state = "ours";
				current = { base: "", ours: "", theirs: "" };
			} else if (marker !== undefined) return null;
			else segments[segments.length - 1] += line;
		} else if (state === "ours") {
			if (marker === mid) state = "base";
			else if (marker !== undefined) return null;
			else current.ours += line;
		} else if (state === "base") {
			if (marker === sep) state = "theirs";
			else if (marker !== undefined) return null;
			else current.base += line;
		} else if (marker === close) {
			hunks.push(current);
			segments.push("");
			state = "clean";
		} else if (marker !== undefined) return null;
		else current.theirs += line;
	}
	if (state !== "clean") return null;
	return { segments, hunks };
}

/**
 * Interleave clean segments with one text per hunk.
 * @param {string[]} segments
 * @param {string[]} fills
 */
export function fillTemplate(segments, fills) {
	if (fills.length !== segments.length - 1) throw new Error("fillTemplate: one fill per hunk");
	return segments.reduce((text, segment, i) => text + segment + (i < fills.length ? fills[i] : ""), "");
}

/**
 * The hunk texts of `text` when it is the clean `segments`, in order and
 * unchanged, with any text between them; null when a clean segment was
 * changed, dropped or moved. Leftmost placement is used, which finds a match
 * whenever one exists.
 *
 * @param {string[]} segments
 * @param {string} text
 * @returns {string[] | null}
 */
export function matchTemplate(segments, text) {
	if (segments.length === 0) return null;
	if (!text.startsWith(segments[0])) return null;
	if (segments.length === 1) return text === segments[0] ? [] : null;
	/** @type {string[]} */
	const fills = [];
	let pos = segments[0].length;
	for (let i = 1; i < segments.length; i++) {
		const segment = segments[i];
		if (i === segments.length - 1) {
			const start = text.length - segment.length;
			if (start < pos || !text.endsWith(segment)) return null;
			fills.push(text.slice(pos, start));
			pos = text.length;
		} else {
			const at = text.indexOf(segment, pos);
			if (at < 0) return null;
			fills.push(text.slice(pos, at));
			pos = at + segment.length;
		}
	}
	return fills;
}

/**
 * @typedef {{ id: string, role: string, intent: string, paths: string[], sha: string, claim_work_id?: string | null, files?: string[] }} SubCommit
 */

/**
 * @param {SubCommit[]} commits
 */
function claimRecord(commits) {
	return commits.map((commit) => ({
		id: commit.id,
		role: commit.role,
		intent: commit.intent,
		paths: commit.paths,
		commit: commit.sha,
		claim_work_id: commit.claim_work_id ?? null,
	}));
}

/**
 * @param {string} repo
 * @param {string} baseline
 * @param {SubCommit[]} commits
 * @returns {{ owners: Map<string, SubCommit[]>, conflicts: Array<{ path: string, group: SubCommit[] }> }}
 */
function classifyEdits(repo, baseline, commits) {
	if (commits.length < 2) throw new Error("combine needs at least two sub-agent commits");
	/** @type {Map<string, SubCommit[]>} */
	const owners = new Map();
	for (const commit of commits) {
		const names = git(repo, ["diff", "--name-only", baseline, commit.sha]).stdout.split("\n").filter(Boolean);
		if (names.length === 0) throw new Error(`${commit.id} changed no files`);
		for (const file of names) {
			if (file === RECORD_PATH || file === CONFLICT_PATH || file.startsWith(".madgrix/sides/")) continue;
			if (!pathInScope(file, commit.paths)) {
				throw new Error(`${commit.id} changed ${file}, which is outside its role scope`);
			}
			const list = owners.get(file) ?? [];
			list.push(commit);
			owners.set(file, list);
		}
	}
	/** @type {Array<{ path: string, group: SubCommit[] }>} */
	const conflicts = [];
	for (const [file, group] of owners) {
		if (group.length < 2) continue;
		if (mergeDisjointEdits(repo, baseline, file, group) === null) conflicts.push({ path: file, group });
	}
	return { owners, conflicts };
}

/**
 * Control-plane composition record. The runner writes it into the result
 * file. live-e2e posts it with the control token. A coding agent never
 * receives that token, and the resolver does not receive it either.
 * Conflict side text is shortened to the display excerpt.
 *
 * Hunk records carry digests only; side bodies stay with the runner.
 * `witness_manifest_sha256`, `resolution` and `witness_check` are passed
 * through when the caller has them (specs/amendments/governed-resolution-v1.md).
 *
 * @param {{ status: "COMPOSED" | "CONFLICTED" | "RESOLVED", baseline: string, commits: SubCommit[], conflict: { files: Array<{ path: string, classification: string, sides: Array<{ agent_id: string, role: string, intent: string, sha: string, text?: string }>, hunks?: Array<{ index: number, base: string, sides: Array<{ agent_id: string, text: string }> }> | null }> } | null, sha: string | null, contender_id: string, witness_manifest_sha256?: string | null, resolution?: import("../../src/lib/types.ts").CompositionResolution | null, witness_check?: import("../../src/lib/types.ts").WitnessCheck | null }} input
 */
export function authorityComposition(input) {
	const files = (input.conflict?.files ?? []).map((file) => ({
		path: file.path,
		classification: /** @type {const} */ ("textual-line-overlap"),
		sides: file.sides.map((side) => ({
			agent_id: side.agent_id,
			role: side.role,
			intent: side.intent,
			sha: side.sha,
			excerpt: typeof side.text === "string" ? side.text.slice(0, 400) : "",
		})),
		...(Array.isArray(file.hunks) && file.hunks.length > 0
			? {
					hunks: file.hunks.map((hunk) => ({
						index: hunk.index,
						base_sha256: sha256Text(hunk.base),
						sides: hunk.sides.map((side) => ({ agent_id: side.agent_id, sha256: sha256Text(side.text) })),
					})),
				}
			: {}),
	}));
	const extras = {
		...(input.witness_manifest_sha256 ? { witness_manifest_sha256: input.witness_manifest_sha256 } : {}),
		...(input.status === "RESOLVED" && input.resolution ? { resolution: input.resolution } : {}),
		...(input.status === "COMPOSED" && input.witness_check ? { witness_check: input.witness_check } : {}),
	};
	return {
		...extras,
		status: input.status,
		contender_id: input.contender_id,
		baseline: input.baseline,
		agents: input.commits.map((commit) => ({
			id: commit.id,
			role: commit.role,
			intent: commit.intent,
			sha: commit.sha,
			paths: commit.paths,
			claim_work_id: commit.claim_work_id ?? null,
		})),
		contributing_shas: input.commits.map((commit) => commit.sha),
		files,
		candidate_sha: input.status === "CONFLICTED" ? null : input.sha,
	};
}

/**
 * Resolver input. Side bodies stay here; the authority record keeps excerpts.
 *
 * @param {string} repo
 * @param {string} baseline
 * @param {SubCommit[]} commits
 * @param {Array<{ path: string, group: SubCommit[] }>} conflicts
 */
function conflictRecord(repo, baseline, commits, conflicts) {
	return {
		status: /** @type {const} */ ("CONFLICTED"),
		baseline,
		agents: claimRecord(commits),
		contributing_shas: commits.map((commit) => commit.sha),
		files: conflicts.map((conflict) => {
			const base = blobText(repo, baseline, conflict.path);
			const sides = conflict.group.map((owner) => ({
				agent_id: owner.id,
				role: owner.role,
				intent: owner.intent,
				sha: owner.sha,
				text: blobText(repo, owner.sha, conflict.path),
			}));
			// Two sides split into hunks; three or more sides on one file, or a
			// split that is not exact, lease the whole file (hunks: null).
			const split = sides.length === 2 ? conflictHunks(base, sides[0].text, sides[1].text) : null;
			const hunked = split !== null && split.hunks.length > 0;
			return {
				path: conflict.path,
				classification: "textual-line-overlap",
				base,
				sides,
				segments: hunked ? split.segments : null,
				hunks: hunked
					? split.hunks.map((hunk, index) => ({
							index,
							base: hunk.base,
							sides: [
								{ agent_id: sides[0].agent_id, text: hunk.ours },
								{ agent_id: sides[1].agent_id, text: hunk.theirs },
							],
						}))
					: null,
			};
		}),
	};
}

/**
 * The text the authority leaves in a leased file before the resolver runs:
 * every clean region merged, each conflicted hunk at its baseline text. A
 * whole-file lease leaves the baseline file.
 *
 * @param {ReturnType<typeof conflictRecord>["files"][number]} file
 */
function precomposedText(file) {
	if (file.segments === null || file.hunks === null) return file.base;
	return fillTemplate(file.segments, file.hunks.map((hunk) => hunk.base));
}

/**
 * @param {string} repo
 * @param {string} baseline
 * @param {SubCommit[]} commits
 * @param {Record<string, unknown>} record
 * @param {string} message
 */
function commitIndex(repo, baseline, commits, record, message) {
	mkdirSync(path.join(repo, ".madgrix"), { recursive: true });
	writeFileSync(path.join(repo, RECORD_PATH), `${JSON.stringify(record, null, 2)}\n`);
	git(repo, ["add", "--", RECORD_PATH]);
	if (toolStatusSession) {
		// A fresh log for THIS run replaces any log inherited from the baseline
		// (specs/amendments/tool-status-v1.md: a leftover log fails binding).
		writeFileSync(path.join(repo, TOOL_STATUS_PATH), toolStatusLog(toolStatusSession, commits));
		git(repo, ["add", "--", TOOL_STATUS_PATH]);
	}
	const tree = git(repo, ["write-tree"]).stdout.trim();
	const parentArgs = ["-p", baseline, ...commits.flatMap((commit) => ["-p", commit.sha])];
	const sha = git(repo, ["commit-tree", tree, ...parentArgs, "-m", message]).stdout.trim();
	git(repo, ["checkout", "-B", "main", sha]);
	return sha;
}

/**
 * Write every crew edit outside `skip` into the index and working tree: a file
 * one agent changed comes from that agent's commit, a file several agents
 * changed is their disjoint three-way merge. COMPOSED skips nothing. The
 * resolution lease skips the conflicted paths, so the authority, not the
 * resolver, writes everything that was never in conflict.
 *
 * @param {string} repo
 * @param {string} baseline
 * @param {Map<string, SubCommit[]>} owners
 * @param {Set<string>} [skip]
 */
function applyCleanEdits(repo, baseline, owners, skip = new Set()) {
	for (const [file, group] of owners) {
		if (skip.has(file)) continue;
		mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
		if (group.length === 1) {
			git(repo, ["checkout", group[0].sha, "--", file]);
			continue;
		}
		const merged = mergeDisjointEdits(repo, baseline, file, group);
		if (merged === null) throw new Error(`combine lost a conflict on ${file}`);
		writeFileSync(path.join(repo, file), merged);
		git(repo, ["add", "--", file]);
	}
}

/**
 * COMPOSED writes one commit whose parents are the baseline and every
 * sub-agent commit. CONFLICTED writes nothing: main stays at the baseline,
 * and the return value is the only conflict object.
 *
 * @param {string} repo
 * @param {string} baseline
 * @param {SubCommit[]} commits
 */
export function combineSubagentBranches(repo, baseline, commits) {
	const { owners, conflicts } = classifyEdits(repo, baseline, commits);
	if (conflicts.length > 0) {
		const conflict = conflictRecord(repo, baseline, commits, conflicts);
		return {
			status: /** @type {const} */ ("CONFLICTED"),
			sha: null,
			overlap: conflicts.map((conflict) => conflict.path),
			recordPath: null,
			resolution: /** @type {const} */ ("CONFLICTED"),
			conflict,
		};
	}
	git(repo, ["checkout", "-B", "main", baseline]);
	git(repo, ["read-tree", baseline]);
	applyCleanEdits(repo, baseline, owners);
	const record = {
		parent_fork: true,
		status: "COMPOSED",
		resolution: "COMPOSED",
		overlap: /** @type {string[]} */ ([]),
		claims: claimRecord(commits),
	};
	const sha = commitIndex(
		repo,
		baseline,
		commits,
		record,
		`MADGRIX compose\n\n${commits.map((commit) => `${commit.id}: ${commit.intent}`).join("\n")}`,
	);
	return {
		status: /** @type {const} */ ("COMPOSED"),
		sha,
		overlap: /** @type {string[]} */ ([]),
		recordPath: RECORD_PATH,
		resolution: /** @type {const} */ ("COMPOSED"),
		conflict: null,
	};
}

/** MIT commit of https://github.com/YashwanthGathuku/theustad branch claude/project-analysis-bugs-xdq0xz. */
export const THEUSTAD_MIT_COMMIT = "7d021cbbfede6db8b37ae01e49cd89919f80535d";

/**
 * Gate the combined commit. `python theustad.py` runs on the frozen baseline
 * with state and logs outside the agent workspace. Only exit 0 and
 * `FINAL VERIFIED` may continue. Hook mode is not used.
 *
 * @param {string} repo
 * @param {string} baseline
 */
export function verifyFrozenBaseline(repo, baseline) {
	const root = process.env.MADGRIX_THEUSTAD_ROOT || path.join(repoRoot, "third_party/theustad");
	const script = path.join(root, "theustad.py");
	const python = process.env.MADGRIX_PYTHON || "python3";
	// TheUstad splits --cmd and --verifier with shlex, which treats "\" as an
	// escape. Forward slashes keep the same scripts addressable on Windows.
	/** @param {string} file */
	const slash = (file) => file.replaceAll("\\", "/");
	const claim = slash(path.join(repoRoot, "scripts/theustad-baseline-claim.py"));
	const check = slash(path.join(repoRoot, "scripts/theustad-baseline-check.py"));
	const stateDir = mkdtempSync(path.join(os.tmpdir(), "madgrix-theustad-state-"));
	const logDir = mkdtempSync(path.join(os.tmpdir(), "madgrix-theustad-logs-"));
	const result = spawnSync(
		python,
		[
			script,
			"--repo",
			repo,
			"--cmd",
			`${python} ${claim}`,
			"--verifier",
			`${python} ${check} ${baseline}`,
			"--state-dir",
			stateDir,
			"--log",
			logDir,
			"--max-retries",
			"0",
			"--timeout",
			"30",
			"--no-color",
		],
		{
			cwd: root,
			encoding: "utf8",
			timeout: 60_000,
			env: minimalEnv({
				PYTHONDONTWRITEBYTECODE: "1",
				PYTHONUNBUFFERED: "1",
			}),
		},
	);
	const stdout = result.stdout ?? "";
	const finalLine = stdout.match(/^FINAL \S+$/m)?.[0] ?? "no FINAL line";
	if (result.error || (result.status ?? 1) !== 0 || finalLine !== "FINAL VERIFIED") {
		const exit = result.error ? result.error.message : String(result.status ?? "signal");
		throw new Error(`TheUstad blocked the combined commit: ${finalLine} (exit ${exit})`);
	}
	return { final: finalLine, exit: 0 };
}

/**
 * Run each sub-agent command in its own worktree of `repo`, concurrently,
 * then combine. `runSub` may record a claim_work_id on the sub object. It
 * must not create another repo. The worktree path is the directory it receives.
 *
 * @param {string} repo
 * @param {ReturnType<typeof loadForkCrew>} crew
 * @param {(sub: ReturnType<typeof loadForkCrew>["subs"][number], repo: string) => void | Promise<void>} [runSub]
 * @param {(repo: string, baseline: string) => void | { final: string, exit: number }} [verify]
 */
export async function runCrewOnFork(repo, crew, runSub, verify = verifyFrozenBaseline) {
	const baseline = git(repo, ["rev-parse", "HEAD"]).stdout.trim();
	/** @type {Array<{ sub: ReturnType<typeof loadForkCrew>["subs"][number], wt: string }>} */
	const prepared = crew.subs.map((sub) => {
		const wt = mkdtempSync(path.join(os.tmpdir(), `madgrix-${sub.id}-`));
		git(repo, ["worktree", "add", "--quiet", "-b", `madgrix/${sub.id}`, wt, baseline]);
		return { sub, wt };
	});
	/** @type {SubCommit[]} */
	let commits = [];
	try {
		await Promise.all(prepared.map(({ sub, wt }) => (runSub ? runSub(sub, wt) : runConfiguredCommand(sub, wt))));
		commits = prepared.map(({ sub, wt }) => commitWorktree(sub, wt));
	} finally {
		for (const { wt } of prepared) {
			git(repo, ["worktree", "remove", "--force", wt], { allowFailure: true });
			rmSync(wt, { recursive: true, force: true });
		}
	}
	// The gate's FINAL line is carried in the result so the live log can print
	// TheUstad's verdict (a throwing gate never reaches this point).
	const theustad = verify(repo, baseline) ?? null;
	const combined = combineSubagentBranches(repo, baseline, commits);
	return { baseline, commits, theustad, ...combined };
}

export const RESOLUTION_LEASE_VERSION = "madgrix-resolution-lease/v1";

/**
 * Apply a resolver command to a CONFLICTED crew result under a resolution
 * lease (specs/amendments/resolution-lease-v1.md).
 *
 * The authority first writes the pre-composed tree itself: the baseline plus
 * every crew edit that was never in conflict. Only the conflicted paths are
 * leased to the resolver, and they hold their baseline text. The resolver
 * reads its inputs from a directory outside the repository
 * (`MADGRIX_CONFLICT_PATH`, `MADGRIX_SIDES_DIR`), so nothing it was shown is
 * committed. Afterwards the staged tree may differ from the pre-composed
 * tree only on leased paths; any other change, including a deleted file, is
 * refused and the checkout returns to the baseline.
 *
 * The resolver does not receive a MADGRIX service token. The commit it
 * produces is a new candidate; this function does not evaluate or promote it.
 * The lease bounds WHERE a resolver may write. It does not check that the
 * leased text keeps each side's intent; that is the job of evaluation.
 *
 * Within a leased file, a two-sided conflict is leased by hunk: the file
 * holds every clean region already merged and each conflicted hunk at its
 * baseline text, and the resolved file must keep those clean regions, in
 * order and unchanged. Three or more sides on one file lease the whole file.
 *
 * `opts.env` adds variables to the resolver's environment (a replayer
 * command, a model API key). A name that looks like a service token or a
 * Cloudflare credential is refused, and the lease's own MADGRIX_* inputs
 * cannot be overridden. `opts.resolver` names the resolver in the record.
 *
 * @param {string} repo
 * @param {{ status: string, baseline: string, commits: SubCommit[], conflict: ReturnType<typeof conflictRecord> | null }} crewResult
 * @param {string} command
 * @param {{ env?: Record<string, string>, resolver?: { id: string, rung: string, order?: string | null } }} [opts]
 */
export function resolveComposition(repo, crewResult, command, opts = {}) {
	if (crewResult.status !== "CONFLICTED" || crewResult.conflict === null) {
		throw new Error("resolveComposition requires a CONFLICTED result");
	}
	if (typeof command !== "string" || command.length === 0) throw new Error("resolver command is empty");
	const extraEnv = opts.env ?? {};
	for (const name of Object.keys(extraEnv)) {
		if (FORBIDDEN_RESOLVER_ENV.test(name) || LEASE_ENV.has(name)) {
			throw new Error(`resolver environment may not set ${name}`);
		}
	}
	const resolver = opts.resolver ?? { id: "command", rung: "command", order: null };
	const baseline = crewResult.baseline;
	const leasedPaths = crewResult.conflict.files.map((file) => file.path);
	const leased = new Set(leasedPaths);

	git(repo, ["checkout", "-B", "main", baseline]);
	git(repo, ["reset", "--hard", baseline]);
	git(repo, ["clean", "-fd"]);
	// The lease is derived from the crew's commits, not trusted from the record:
	// a record that names a path the commits do not conflict on (or omits one)
	// would widen or shrink what the resolver may write. The hunks are derived
	// the same way.
	const { owners, conflicts } = classifyEdits(repo, baseline, crewResult.commits);
	const derived = conflicts.map((conflict) => conflict.path).sort();
	if (JSON.stringify(derived) !== JSON.stringify([...leasedPaths].sort())) {
		throw new Error(
			`conflict record names ${[...leasedPaths].sort().join(", ") || "no paths"}, ` +
				`but the crew's commits conflict on ${derived.join(", ") || "no paths"}`,
		);
	}
	const conflict = conflictRecord(repo, baseline, crewResult.commits, conflicts);
	applyCleanEdits(repo, baseline, owners, leased);
	for (const file of conflict.files) {
		const full = path.join(repo, file.path);
		mkdirSync(path.dirname(full), { recursive: true });
		const text = precomposedText(file);
		if (text === "" && file.base === "" && file.segments === null) rmSync(full, { force: true });
		else writeFileSync(full, text);
	}
	git(repo, ["add", "-A"]);
	const precomposedTree = git(repo, ["write-tree"]).stdout.trim();

	/** @type {Array<{ path: string, index: number, base_sha256: string, resolution_sha256: string }>} */
	const resolvedHunks = [];
	const inputs = mkdtempSync(path.join(os.tmpdir(), "madgrix-resolve-"));
	const sidesDir = path.join(inputs, "sides");
	try {
		const conflictFile = path.join(inputs, "conflict.json");
		writeFileSync(conflictFile, `${JSON.stringify(conflict, null, 2)}\n`);
		for (const file of conflict.files) {
			for (const side of file.sides) {
				const dest = path.resolve(sidesDir, side.agent_id, file.path);
				if (!dest.startsWith(`${sidesDir}${path.sep}`)) {
					throw new Error(`conflict side ${side.agent_id}:${file.path} escapes the resolver input directory`);
				}
				mkdirSync(path.dirname(dest), { recursive: true });
				writeFileSync(dest, side.text);
			}
		}
		const result = spawnSync("bash", ["-c", command], {
			cwd: repo,
			encoding: "utf8",
			env: minimalEnv({
				...extraEnv,
				MADGRIX_CONFLICT_PATH: conflictFile,
				MADGRIX_SIDES_DIR: sidesDir,
				MADGRIX_BASELINE_SHA: baseline,
				MADGRIX_LEASED_PATHS: leasedPaths.join("\n"),
			}),
		});
		if (result.error || (result.status ?? 1) !== 0) {
			const detail = (result.stderr ?? "").trim().split("\n").slice(-1)[0];
			throw new Error(`resolver exited ${result.status ?? "signal"}${detail ? `: ${detail}` : ""}`);
		}
		git(repo, ["add", "-A"]);
		const changed = git(repo, ["diff-index", "--cached", "--name-only", "--no-renames", precomposedTree])
			.stdout.split("\n")
			.filter(Boolean);
		const outside = changed.filter((file) => !leased.has(file));
		if (outside.length > 0) {
			throw new Error(`resolver changed ${outside.join(", ")}, outside its lease (${leasedPaths.join(", ")})`);
		}
		if (changed.length === 0) throw new Error("resolver produced no change");
		for (const file of conflict.files) {
			let onDisk = "";
			try {
				onDisk = readFileSync(path.join(repo, file.path), "utf8");
			} catch {
				throw new Error(`resolver left ${file.path} unresolved`);
			}
			if (onDisk.includes("<<<<<<<") || onDisk.includes(">>>>>>>")) {
				throw new Error(`resolver left conflict markers in ${file.path}`);
			}
			if (!changed.includes(file.path)) throw new Error(`resolver left ${file.path} unresolved`);
			if (file.segments !== null && file.hunks !== null) {
				const fills = matchTemplate(file.segments, onDisk);
				if (fills === null) {
					throw new Error(`resolver changed clean lines of ${file.path} outside its leased hunks`);
				}
				fills.forEach((fill, index) => {
					resolvedHunks.push({
						path: file.path,
						index,
						base_sha256: sha256Text(file.hunks?.[index]?.base ?? ""),
						resolution_sha256: sha256Text(fill),
					});
				});
			}
		}
	} catch (error) {
		git(repo, ["reset", "--hard", baseline], { allowFailure: true });
		git(repo, ["clean", "-fd"], { allowFailure: true });
		throw error;
	} finally {
		rmSync(inputs, { recursive: true, force: true });
	}
	const lease = {
		format: RESOLUTION_LEASE_VERSION,
		paths: leasedPaths,
		hunked_paths: conflict.files.filter((file) => file.hunks !== null).map((file) => file.path),
		precomposed_tree: precomposedTree,
	};
	const record = {
		parent_fork: true,
		status: "RESOLVED",
		resolution: "RESOLVED",
		overlap: leasedPaths,
		claims: claimRecord(crewResult.commits),
		resolved_from: crewResult.conflict.contributing_shas,
		lease,
		resolver: { id: resolver.id, rung: resolver.rung, order: resolver.order ?? null },
	};
	const sha = commitIndex(
		repo,
		crewResult.baseline,
		crewResult.commits,
		record,
		`MADGRIX resolve (${resolver.rung})\n\n${crewResult.commits.map((commit) => `${commit.id}: ${commit.intent}`).join("\n")}`,
	);
	return {
		status: /** @type {const} */ ("RESOLVED"),
		sha,
		resolution: /** @type {const} */ ("RESOLVED"),
		recordPath: RECORD_PATH,
		lease: { ...lease, hunks: resolvedHunks },
		resolver: record.resolver,
	};
}

/** Names a resolver environment may never carry. */
const FORBIDDEN_RESOLVER_ENV = /SERVICE_TOKEN|AUTHORITY_SIGNING_KEY|CLOUDFLARE|^CF_/i;
/** The lease's own inputs; a caller cannot override them. */
const LEASE_ENV = new Set(["MADGRIX_CONFLICT_PATH", "MADGRIX_SIDES_DIR", "MADGRIX_BASELINE_SHA", "MADGRIX_LEASED_PATHS"]);

/**
 * @param {ReturnType<typeof loadForkCrew>["subs"][number]} sub
 * @param {string} wt
 * @returns {SubCommit}
 */
function commitWorktree(sub, wt) {
	const files = porcelainPaths(git(wt, ["status", "--porcelain", "-uall"]).stdout);
	if (files.length === 0) throw new Error(`${sub.id} produced no change on the parent fork`);
	for (const file of files) {
		if (!pathInScope(file, sub.paths)) {
			throw new Error(`${sub.id} changed ${file}, which is outside its role scope`);
		}
	}
	git(wt, ["add", "-A"]);
	git(wt, ["commit", "-m", `MADGRIX sub-agent ${sub.id}: ${sub.intent}`]);
	const sha = git(wt, ["rev-parse", "HEAD"]).stdout.trim();
	const claimed = /** @type {{ claim_work_id?: string | null }} */ (sub).claim_work_id ?? null;
	return {
		id: sub.id,
		role: sub.role,
		intent: sub.intent,
		paths: sub.paths,
		sha,
		claim_work_id: claimed,
		files,
	};
}

/**
 * @param {{ id: string, role: string, intent: string, paths: string[], command: string }} sub
 * @param {string} repo
 * @returns {Promise<void>}
 */
function runConfiguredCommand(sub, repo) {
	const env = minimalEnv({
		MADGRIX_AGENT_ID: sub.id,
		MADGRIX_AGENT_ROLE: sub.role,
		MADGRIX_SCOPE_PATHS: sub.paths.join(","),
		MADGRIX_SUBAGENT_INTENT: sub.intent,
	});
	return new Promise((resolve, reject) => {
		const child = spawn("bash", ["-c", sub.command], { cwd: repo, env });
		child.on("error", () => reject(new Error(`${sub.id} command failed to start`)));
		child.on("close", (status) => {
			if (status !== 0) reject(new Error(`${sub.id} command exited ${status ?? "signal"}`));
			else resolve();
		});
	});
}
