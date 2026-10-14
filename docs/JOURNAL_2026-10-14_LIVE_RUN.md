# Journal: the third live run — from scratch to results

**Date:** 2026-10-14 (competition deadline day)
**Branch:** `grok/final-live` @ `cb8e384`
**Author:** Ash (the agent), written as it happened

This is the whole story of one live run, told in order, from a standing start
to whatever the result is. Nothing is reconstructed from memory afterward —
each chapter was written when its events happened.

---

## Chapter 1 — The starting point (12:51 ET)

The situation I inherited, in plain terms:

- The Worker is deployed at `https://madgrix.ygathuku96.workers.dev`. It answers
  `/health` with 200 and serves a landing page at `/`.
- Two live runs already happened on this branch (run 1: promoted `3b71d3a`,
  run 2: promoted `fc9c1e7`). Both VERIFIED, TheUstad FINAL VERIFIED both times.
- The Worker was deployed by Grok, not by the human operator. The three
  service tokens (CONTROL, AGENT, EVALUATION) — the passwords the Worker's API
  checks — were set by Grok. The operator doesn't have them. Nobody can read
  them back: Cloudflare secrets are write-only by design.
- The operator's ask: rotate the tokens so he owns them, run the live E2E
  from scratch on this machine, write this journal, and build the demo video.

The "real repo" for this run is `starter-repo` in the `default` Artifacts
namespace — the same baseline the first two runs used. Each run promotes onto
its main, so the baseline commit for run 3 must be run 2's promotion.

## Chapter 2 — Taking ownership of the tokens (12:52–12:58 ET)

First I confirmed the secrets exist but are unreadable:

```
cf workers secrets list --script-name madgrix
→ AGENT_SERVICE_TOKEN, AUTHORITY_SIGNING_KEY, CONTROL_SERVICE_TOKEN,
  EVALUATION_SERVICE_TOKEN (names only, never values)
```

A sweep of the repo confirmed no token values are stored anywhere in it —
only documentation references. Recovery was impossible, so rotation was the
only path. (Deliberately untouched: `AUTHORITY_SIGNING_KEY`. The repo pins
its public half in `keys/authority.pub`, and every signed bundle depends on
it. Rotating it would break offline verification of all existing bundles.)

The `cf` CLI needed `--type secret_text` (its first attempt asked to "run
interactively" and silently did nothing — a small trap I verified by testing
the token afterward and getting 401). With the flag, all three rotations
returned success JSON.

Verification, in order:
1. New CONTROL token → `POST /tasks` → 401 at first (propagation delay),
   then 400 `intent_required` after ~30s. Auth passed; it's asking for a body.
2. New AGENT token → `GET /tasks/nonexistent/context` → 404 `task_not_found`.
   Auth passed.

The old tokens are dead. The operator is now the only person who knows the
new ones. They are stored at `~/workspace/madgrix-live-run/service-tokens.txt`
(mode 600) until he moves them to his password manager.

## Chapter 3 — The baseline (12:58 ET)

`starter-repo` main, read live via `git ls-remote` with a fresh read-scoped
token:

```
fc9c1e7084ad14067012a56e68bd8f4c5bdc85c2  HEAD
fc9c1e7084ad14067012a56e68bd8f4c5bdc85c2  refs/heads/main
```

Exactly run 2's promoted SHA. The runner refuses a fork whose main is not the
frozen baseline, so this value — and only this value — goes into
`MADGRIX_BASELINE_COMMIT`.

The queue `madgrix-events` exists: id `c09eba4370be4bf383f3a3ded551895b`.

## Chapter 4 — The sandbox fight (13:00–13:20 ET)

This machine is a sandbox. Its egress goes through a proxy, and the runner
strips the environment down to almost nothing before spawning children. Three
separate failures, each fixed without touching the repo:

1. `cf` not on PATH → added `node_modules/.bin` to PATH in the runner.
2. `cf queues list` → "fetch failed" in the preflight → the stripped env
   lacks proxy variables. A `/tmp/mgx-bin/cf` shim re-injects them.
3. Then the shim broke: the sandbox rotates the proxy *password* every minute
   or two. The fix: `/etc/profile.d/hatch-egress.sh` shows the proxy also
   accepts the credential-free URL `http://hatch-egress-proxy:3128`, which is
   static. The shims source that file. (Shims: `cf`, `git`, `node` — the
   child `node` needed one too once the fork-crew ran, because its own
   `fetch()` calls to the Worker had no proxy config: `ERR_SSL_WRONG_VERSION_NUMBER`.)

No repo files were modified for any of this. The tree is still exactly
`cb8e384`.

## Chapter 5 — Run 3, attempt 1: rejected at the gates (13:20–13:35 ET)

The first attempt ran clean through 6/9:

- 1/9 froze the task, 2/9 committed blind verifier references,
- 3/9 forked `starter-repo` and the crew combined to `bb39dbdc…`,
- 4/9 real Artifacts push events arrived through the queue,
- 5/9 the independent evaluation ran,
- 6/9 TheUstad gate: **FINAL VERIFIED**.

Then it stopped: "no candidate passed the independent mandatory evaluation
gates." The evaluation bundle said why:

```
"security_policy": { "passed": false,
  "findings": ["outside the claim scope: .madgrix/subagent-intents.json"] }
```

My `MADGRIX_CLAIM_PATHS` was `src/api/**,src/ui/**,src/contract.js`. The
crew harness writes its provenance records (`.madgrix/subagent-intents.json`,
`.madgrix/tool-status.jsonl`) into the tree, and those paths weren't in my
claim. The gate did exactly what it's for: refused a candidate that touched
files outside its declared scope. My claim was wrong, not the gate.

(The `src/contract.js` in my claim was also wrong — that's the *other* demo
config's path. This run's crew only touches `src/api/**` and `src/ui/**`.)

Fix: `MADGRIX_CLAIM_PATHS='src/api/**,src/ui/**,.madgrix/**'`. The failed
attempt promoted nothing, so the baseline is unchanged. Attempt 2 starts now.

## Chapter 6 — Run 3, attempt 2: MADGRIX_LIVE_E2E_OK (13:35–14:05 ET)

Attempt 2 with the fixed claim paths ran all 9 steps to completion:

```
[Git4agents] 1/9 freeze task and verifier identities
[Git4agents] 2/9 commit blind-verifier references before candidates exist
[Git4agents] 3/9 parent forks once; sub-agents commit on that fork
[Git4agents] 4/9 wait for real Artifacts push events through Queue → TaskAuthority
[Git4agents] 5/9 evaluate immutable candidates in the independent evaluation domain
[Git4agents] 6/9 reveal blind references and submit signed independent verdicts
[Git4agents] 6/9 TheUstad gate: FINAL VERIFIED (combined b3ee4c86…)
[Git4agents] 7/9 execute Verdict Seam and issue exact-state permit
[Git4agents] 8/9 promote the exact reviewed commit to canonical Artifacts state
[Git4agents] 9/9 fetch the authority-signed bundle and verify it offline
```

The offline verifier printed:

```
subject digest........ OK
candidate digest...... OK
chain integrity....... OK
hidden evaluation..... PASSED
policy digest......... OK
destination base...... OK
authority key......... PINNED
signature............. VALID
permit id............. RECOMPUTED FROM BOUND FIELDS
ledger chain.......... OK

VERIFIED
```

Final status: `"status": "MADGRIX_LIVE_E2E_OK"`.

The facts, for the record:

| Item | Value |
|---|---|
| Task | `task_735cca4ac580564e368e4574` |
| Baseline | `fc9c1e7084ad14067012a56e68bd8f4c5bdc85c2` (run 2's promotion) |
| Crew | parent + sub-api + sub-ui (3 concurrent agents, 1 contender) |
| Combined / winner / promoted SHA | `b3ee4c862dcc6996678dc25c1de5c49b060fa9d4` — all three identical |
| TheUstad | FINAL VERIFIED |
| Permit | `e0cbfeac1d5cd19356c8457185fb03a7948b4e6534364c97d3110208006875c9` |
| Bundle | `~/workspace/madgrix-live-run/promotion.bundle` (offline-verified) |

And the independent confirmation that the promotion is real, not just a
Worker-side claim — `git ls-remote` against the actual Artifacts remote
after the run:

```
b3ee4c862dcc6996678dc25c1de5c49b060fa9d4  HEAD
b3ee4c862dcc6996678dc25c1de5c49b060fa9d4  refs/heads/main
```

`starter-repo` main moved from run 2's SHA to run 3's SHA. The authorized
SHA and the promoted SHA are the same SHA.

## Chapter 7 — What this run proved (and what it didn't)

Proved: the whole loop works against real Cloudflare infrastructure with a
real repository — fork, concurrent sub-agent commits, push events through the
queue, independent evaluation, blind verdicts, TheUstad gate, exact-state
permit, container promotion, offline bundle verification. The security gate
that rejected attempt 1 is the same machinery that passed attempt 2: it
wasn't bypassed, the claim was corrected.

Not proved: reliability (three runs are evidence, not a statistic),
adversarial robustness beyond the hostile-audit rounds, or anything about
performance under load. The sub-agents here are scripted commands, not
LLMs — the *coordination* is what's being demonstrated, not agent
intelligence.

## Sandbox notes (for whoever runs this next)

- The runner's `minimalEnv()` strips proxy variables; on a sandboxed host
  you need `/tmp/mgx-bin/{cf,git,node}` shims that source
  `/etc/profile.d/hatch-egress.sh`. The credential-free proxy URL is static;
  the credentialed one rotates every minute or two — don't bake it in.
- `cf workers secrets update` needs `--type secret_text` or it silently
  asks to "run interactively" and changes nothing. Always verify a rotation
  with a real authenticated request afterward (expect 400s, not 401s).
- Secret rotations take ~30s to propagate to the Worker.

## Chapter 8 — Run 4: the recorded run (14:19–14:21 ET)

The operator asked for a genuine recording of the run — not a narrated
summary. Run 4 was executed under `script(1)` with full timing capture.

| Item | Value |
|---|---|
| Task | `task_79b1f9d610e94d8e95daa503` |
| Baseline | `b3ee4c862dcc6996678dc25c1de5c49b060fa9d4` (run 3's promotion) |
| Combined / promoted SHA | `d55332b544992a2e033ca03fa54972c5283eef73` |
| TheUstad | FINAL VERIFIED |
| Result | `MADGRIX_LIVE_E2E_OK`, offline bundle `VERIFIED` |

`starter-repo` main confirmed at `d55332b5` via `git ls-remote` afterward —
the fourth consecutive promotion, each one's baseline the previous one's
promotion.

Artifacts: the raw typescript (`~/workspace/madgrix-live-run/video/rec4/`)
and the replay video (`~/workspace/madgrix-live-run/video/git4agents-live-run4.mp4`,
88s, idle periods compressed, labeled on-screen).
