/**
 * Moving `main` in a shared repository with compare-and-swap.
 *
 * Every control-plane step works on a detached HEAD. `main` moves only through
 * publishMain, which runs `git update-ref refs/heads/main <new> <expected-old>`:
 * git refuses the update when main is no longer at the expected commit (for
 * example another crew published in the meantime), and the caller refuses the
 * result instead of overwriting the other run's commit.
 */
import { withRepoLock } from "./repo-lock.mjs";
import { safeGit } from "./safe-git.mjs";

const ZERO = "0".repeat(40);

export class MainMovedError extends Error {
	/** @param {string | null} expected @param {string | null} found */
	constructor(expected, found) {
		super(`main moved: expected ${expected ?? "no main"}, found ${found ?? "no main"}; refusing to overwrite another run's main`);
		this.name = "MainMovedError";
		this.expected = expected;
		this.found = found;
	}
}

/** @param {string} repo @returns {string | null} */
export function readMain(repo) {
	const r = safeGit(repo, ["rev-parse", "--verify", "--quiet", "refs/heads/main^{commit}"], { allowFailure: true });
	return r.status === 0 ? r.stdout.trim() : null;
}

/**
 * Check out `sha` detached (working tree and index), then attach HEAD to main
 * when main is at `sha`. Never moves main.
 * @param {string} repo
 * @param {string} sha
 */
export function restoreCheckout(repo, sha) {
	withRepoLock(repo, () => restoreUnlocked(repo, sha));
}

/** @param {string} repo @param {string} sha */
function restoreUnlocked(repo, sha) {
	safeGit(repo, ["checkout", "--quiet", "--detach", "-f", sha], { allowFailure: true });
	safeGit(repo, ["reset", "--quiet", "--hard", sha], { allowFailure: true });
	safeGit(repo, ["clean", "-fdq"], { allowFailure: true });
	if (readMain(repo) === sha) safeGit(repo, ["symbolic-ref", "HEAD", "refs/heads/main"], { allowFailure: true });
}

/**
 * Move main from `expected` to `sha` atomically and check it out. Throws
 * MainMovedError (and leaves main alone) when main is not at `expected`.
 * @param {string} repo
 * @param {string} sha
 * @param {string | null} expected  null: main must not exist yet
 */
export function publishMain(repo, sha, expected) {
	withRepoLock(repo, () => {
		const r = safeGit(repo, ["update-ref", "-m", "madgrix publish", "refs/heads/main", sha, expected ?? ZERO], { allowFailure: true });
		if (r.status !== 0) throw new MainMovedError(expected, readMain(repo));
		restoreUnlocked(repo, sha);
	});
}
