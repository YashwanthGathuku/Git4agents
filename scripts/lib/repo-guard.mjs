/**
 * The repository files that make git run code or change what it reads:
 * config (and includes inside it), per-worktree config, hooks, info/
 * (attributes, exclude, sparse-checkout), object alternates, and each linked
 * worktree's commondir/gitdir pointers. A sub-agent or resolver that writes
 * any of them is refused, and the files are restored, before control-plane git
 * touches the repository again.
 */
import { lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { safeGit } from "./safe-git.mjs";

/** @param {string} repo */
export function gitCommonDir(repo) {
	return path.resolve(repo, safeGit(repo, ["rev-parse", "--git-common-dir"]).stdout.trim());
}

/**
 * @param {string} root
 * @param {string} rel
 * @param {Map<string, string>} out
 */
function collect(root, rel, out) {
	const full = path.join(root, rel);
	let stat;
	try {
		stat = lstatSync(full);
	} catch {
		return;
	}
	if (stat.isSymbolicLink()) out.set(rel, `link:${readlinkSync(full)}`);
	else if (stat.isDirectory()) {
		out.set(rel, `dir:${stat.mode & 0o7777}`);
		for (const name of readdirSync(full)) collect(root, path.join(rel, name), out);
	} else if (stat.isFile()) out.set(rel, `file:${stat.mode & 0o7777}:${readFileSync(full).toString("base64")}`);
	else out.set(rel, `special:${stat.mode}`);
}

/**
 * @param {string} repo
 * @param {{ worktrees?: string[] }} [opts] linked-worktree admin dir names to
 *   include (default: all). A crew passes only its own, so another crew adding
 *   or removing worktrees concurrently is not mistaken for tampering.
 * @returns {{ root: string, files: Map<string, string>, worktrees?: string[] }}
 */
export function snapshotControlFiles(repo, opts = {}) {
	const root = gitCommonDir(repo);
	/** @type {Map<string, string>} */
	const files = new Map();
	for (const rel of ["config", "config.worktree", "hooks", "info", "objects/info/alternates", "objects/info/http-alternates", "commondir"]) {
		collect(root, rel, files);
	}
	/** @type {string[]} */
	let worktrees = [];
	try {
		worktrees = readdirSync(path.join(root, "worktrees"));
	} catch {}
	if (opts.worktrees) worktrees = worktrees.filter((name) => opts.worktrees?.includes(name));
	for (const name of worktrees) {
		for (const leaf of ["config.worktree", "commondir", "gitdir", "info", "hooks", "config"]) collect(root, path.join("worktrees", name, leaf), files);
	}
	return { root, files, worktrees: opts.worktrees };
}

/**
 * Paths that differ between `before` and now.
 * @param {ReturnType<typeof snapshotControlFiles>} before
 * @param {ReturnType<typeof snapshotControlFiles>} [now]
 */
export function changedControlFiles(before, now = snapshotControlFiles(before.root, { worktrees: before.worktrees })) {
	const changed = new Set();
	for (const [rel, value] of before.files) if (now.files.get(rel) !== value) changed.add(rel);
	for (const rel of now.files.keys()) if (!before.files.has(rel)) changed.add(rel);
	return [...changed].sort();
}

/**
 * Put every control file back as it was in `before`; remove added ones.
 * @param {ReturnType<typeof snapshotControlFiles>} before
 */
export function restoreControlFiles(before) {
	const now = snapshotControlFiles(before.root, { worktrees: before.worktrees });
	const changed = changedControlFiles(before, now);
	// Remove additions deepest-first, then rewrite what existed.
	for (const rel of [...changed].sort((a, b) => b.length - a.length)) {
		if (!before.files.has(rel)) rmSync(path.join(before.root, rel), { recursive: true, force: true });
	}
	for (const rel of [...changed].sort((a, b) => a.length - b.length)) {
		const value = before.files.get(rel);
		if (value === undefined) continue;
		const full = path.join(before.root, rel);
		if (value.startsWith("dir:")) {
			try {
				if (!lstatSync(full).isDirectory()) rmSync(full, { force: true });
			} catch {}
			mkdirSync(full, { recursive: true, mode: Number(value.slice(4)) });
			continue;
		}
		rmSync(full, { recursive: true, force: true });
		mkdirSync(path.dirname(full), { recursive: true });
		if (value.startsWith("link:")) symlinkSync(value.slice(5), full);
		else if (value.startsWith("file:")) {
			const [, mode, data] = value.split(":");
			writeFileSync(full, Buffer.from(data, "base64"), { mode: Number(mode) });
		}
	}
	return changed;
}
