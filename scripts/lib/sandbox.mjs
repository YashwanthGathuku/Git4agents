/**
 * Run an untrusted command (a resolver) contained.
 *
 * - Its own process group, killed with every descendant when it exits or
 *   times out (sandbox-reaper.mjs).
 * - stdout and stderr go to files, so there is no output cap.
 * - With bubblewrap (`bwrap`, used when it works on this host, or required
 *   with MADGRIX_RESOLVER_SANDBOX=bwrap): a new PID namespace and /proc, so
 *   the parent's /proc/<pid>/environ is not reachable; the whole file system
 *   read-only (other runs' witness trees included); ~/.madgrix hidden; only
 *   the work directory and a private TMPDIR writable.
 * - MADGRIX_RESOLVER_SANDBOX=none skips bubblewrap; the process-group reaper
 *   still runs. Without bubblewrap a same-uid command can still read other
 *   processes' /proc entries and write anywhere the uid can.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REAPER = path.join(path.dirname(fileURLToPath(import.meta.url)), "sandbox-reaper.mjs");

export const DEFAULT_RESOLVER_TIMEOUT_MS = 10 * 60_000;

/** @type {boolean | null} */
let bwrapWorks = null;

/** True when bubblewrap can create a PID namespace here. */
export function bubblewrapAvailable() {
	if (bwrapWorks !== null) return bwrapWorks;
	const r = spawnSync("bwrap", ["--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc", "--unshare-pid", "--die-with-parent", "true"], {
		stdio: "ignore",
		timeout: 10_000,
	});
	bwrapWorks = !r.error && r.status === 0;
	return bwrapWorks;
}

/** "bwrap" or "none" for this run. */
export function sandboxMode(env = process.env) {
	const wanted = env.MADGRIX_RESOLVER_SANDBOX ?? "auto";
	if (wanted === "none") return "none";
	if (wanted === "bwrap") {
		if (!bubblewrapAvailable()) throw new Error("MADGRIX_RESOLVER_SANDBOX=bwrap, but bubblewrap cannot create a sandbox here");
		return "bwrap";
	}
	if (wanted !== "auto") throw new Error(`MADGRIX_RESOLVER_SANDBOX must be auto, bwrap or none, not ${wanted}`);
	return bubblewrapAvailable() ? "bwrap" : "none";
}

/**
 * @param {{ command: string, cwd: string, writable: string[], readOnly?: string[], env: Record<string, string>, timeoutMs?: number }} opts
 * @returns {{ status: number | null, signal: string | null, timedOut: boolean, error: string | null, stderrTail: string, sandbox: "bwrap" | "none" }}
 */
export function runContained(opts) {
	const mode = sandboxMode();
	const timeoutMs = opts.timeoutMs ?? DEFAULT_RESOLVER_TIMEOUT_MS;
	const nonce = randomBytes(16).toString("hex");
	const ctl = mkdtempSync(path.join(os.tmpdir(), "madgrix-sandbox-ctl-"));
	try {
		// A private, writable TMPDIR; everything else outside the writable
		// directories is read-only under bubblewrap.
		const scratch = path.join(ctl, "tmp");
		mkdirSync(scratch, { mode: 0o700 });
		/** @type {string[]} */
		let argv = ["bash", "-c", opts.command];
		if (mode === "bwrap") {
			const args = [
				"--die-with-parent", "--new-session",
				"--unshare-pid", "--unshare-ipc", "--unshare-uts", "--unshare-cgroup-try",
				"--ro-bind", "/", "/",
				"--dev", "/dev",
				"--proc", "/proc",
				"--bind", scratch, scratch,
			];
			const home = os.homedir();
			if (existsSync(path.join(home, ".madgrix"))) args.push("--tmpfs", path.join(home, ".madgrix"));
			for (const dir of opts.writable) args.push("--bind", dir, dir);
			for (const dir of opts.readOnly ?? []) args.push("--ro-bind", dir, dir);
			args.push("--chdir", opts.cwd, "--", "bash", "-c", opts.command);
			argv = ["bwrap", ...args];
		}
		const spec = {
			argv,
			cwd: opts.cwd,
			env: { ...opts.env, TMPDIR: scratch, MADGRIX_SANDBOX_RUN: nonce },
			timeoutMs,
			nonce,
			stdoutFile: "/dev/null",
			stderrFile: path.join(ctl, "stderr"),
			resultFile: path.join(ctl, "result.json"),
		};
		writeFileSync(path.join(ctl, "spec.json"), JSON.stringify(spec));
		const r = spawnSync(process.execPath, [REAPER, path.join(ctl, "spec.json")], {
			stdio: "ignore",
			timeout: timeoutMs + 60_000,
			killSignal: "SIGKILL",
			env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
		});
		/** @type {{ status: number | null, signal: string | null, timedOut: boolean, error: string | null }} */
		let result = { status: null, signal: null, timedOut: true, error: r.error ? r.error.message : "the sandbox reaper did not report" };
		try {
			result = JSON.parse(readFileSync(spec.resultFile, "utf8"));
		} catch {}
		let stderrTail = "";
		try {
			const text = readFileSync(spec.stderrFile, "utf8");
			stderrTail = text.slice(-4000).trim().split("\n").slice(-1)[0] ?? "";
		} catch {}
		return { ...result, stderrTail, sandbox: mode };
	} finally {
		rmSync(ctl, { recursive: true, force: true });
	}
}
