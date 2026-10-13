# MADGRIX final hostile audit retest

Retest date: 2026-10-12

Audited behavior, unchanged: `docs/FINAL_HOSTILE_AUDIT.md` on `44fd44ecc43a4daf452678b5378ae98f25ed9449`.

Repair parent: `718f2053708e296b18359a7d560e16cd2ab4934d` (`competition/final`, one docs commit after `6e28a9277eb449532ea0358454bfe870ceff37b6`).

Repair commits, in order:

| SHA | Subject |
|---|---|
| `e86c4fe3ac7bf898d864435634936bd9add8a0ff` | Bind the work graph to the one promotable composition SHA. |
| `0d27cc7f6c762c35576965bb249bac6d9b434da0` | Record a quarantine epoch that void permits and blocked SHAs share. |
| `cb09173b2b5930998996bb018ecf9df202806fd2` | Refuse a non-candidate SHA, a revoked contender, and a stale queue tip. |
| `bf064fb0caeecafa6140d1c394a6adebf076cc2c` | Add the hostile-audit authority regression tests. |
| `35bfb8e7388c7a2127893b166cba7f1f8c41f53c` | Pass minimalEnv to git merge-file. |

The suite below ran on an LF extract of that source before this retest file was added. `container/promote.sh` in the extract was 7330 bytes and contained no CR. Nothing was deployed, merged to `main`, or created in Cloudflare.

## How the attacks were executed

WSL Ubuntu-24.04, Node v24.21.0 at `/home/gathu/node24/bin/node`, `MADGRIX_FLEET_BIN` unset. The tree was `/home/gathu/madgrix-repair-lf`: `git archive` of `718f205` with `core.autocrlf=false`, then the repair files copied with CR stripped.

`test/final-authority-invariants.test.ts` calls `recordComposition`, `submitEvaluation`, `runVerdictSeam`, `issuePermit`, `attemptPromotion`, `ingestQueueEvent`, `quarantineContender`, `reviewQuarantine`, and `runPromotion`. `runPromotion` reads that state from a stub Durable Object and returns before `ARTIFACTS` or the promotion container is touched. The refusal is the real `authorityRefusal`.

## Commands and counts

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx tsc --noEmit -p tsconfig.node.json` | exit 0 |
| `npm test` | 345 tests, 106 suites, 345 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo, `duration_ms` 12751.784234 |
| `npm run slice` | `SLICE OK`. Offline verifier printed `VERIFIED` |
| `npm run headmove` | `HEAD-MOVE OK` |
| `npm run bench` | exit 0, `zero_tolerance_ok: true` |
| `node --test test/promotion-fixtures.test.ts` | 56 pass, 0 fail |
| `node --test test/final-authority-invariants.test.ts` | 13 pass, 0 fail |
| `node --test test/fork-crew.test.ts` | 8 pass, 0 fail, including `git merge-file receives minimalEnv and not the zone tokens` |
| `npm run build` | not run. Docker Desktop was down: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` |

The 345 is the previous 331 plus 13 authority tests and 1 `threeWayMerge` environment test.

## P0-1 CLOSED — exact composition candidate

Before (`44fd44e`, audit): `COMPOSED` with candidate `composed-sha` still issued a permit for accepted `old-sha` and `attemptPromotion` returned `PROMOTED` with `canonical_write` of `old-sha`. A candidate equal to a member SHA omitted from `contributing_shas` was stored, hidden by the work graph, and promoted.

After (this run, `test/final-authority-invariants.test.ts`, 8 tests, 0 fail):

| Attack | Result |
|---|---|
| COMPOSED candidate X, accepted old SHA Y | `issuePermit` → `UNRESOLVED_CONFLICT`, permit null. Seam `REJECT`, winner null. |
| Existing permit for Y | `attemptPromotion` and `runPromotion` → `UNRESOLVED_CONFLICT`. Permit unconsumed. No `canonical_write`. `runPromotion` did not call Artifacts or the container. |
| Candidate equals a member or side SHA omitted from `contributing_shas` | `recordComposition` rejects (`contributing SHA`). |
| That member SHA stuffed into a stored record | Work-graph candidate null. `issuePermit` → `UNRESOLVED_CONFLICT`. Promotion does not consume and has no `canonical_write`. |
| Old SHA after a composition whose candidate is the empty republish | `issuePermit` of the old SHA → `UNRESOLVED_CONFLICT`. Rebinding the candidate throws `already bound`. A republish that is not the bound candidate is rejected at `submitEvaluation`. |
| CONFLICTED, and PENDING / COMPOSING / RESOLVING | No evaluation, no permit, no promotion, no `canonical_write`. |
| RESOLVED | Seam `ACCEPT` names only the resolver SHA. The old SHA is `UNRESOLVED_CONFLICT`. A contributing SHA is rejected. |
| Exact candidate X | `ACCEPT`, `ISSUED`, `PROMOTED`, `canonical_write` of X. |

Amendment: `specs/amendments/exact-composition-candidate-v1.md`. Frozen specs were not edited.

## P0-2 CLOSED — quarantine and REVOKED are terminal

Before: `REVOKED` plus the old permit returned `PROMOTED` and `canonical_write`. A bundle submitted while `QUARANTINED` was stored with `tainted: false` and, after `REVOKED`, was accepted, permitted, and promoted.

After:

| Attack | Result |
|---|---|
| QUARANTINED, new bundle | `RECORDED`, effects `[]`, `tainted: true`, ledger `evaluation_recorded_forensic`, SHA added to `blocked_candidate_shas`. Seam does not `ACCEPT`. |
| QUARANTINED, old permit | `issuePermit` → `QUARANTINED_CANDIDATE`. `attemptPromotion` and `runPromotion` → `QUARANTINED_CANDIDATE`. Unconsumed. No `canonical_write`. No Artifacts call. |
| REVOKED | New evidence throws. Seam does not `ACCEPT`. `issuePermit` → `REVOKED_CANDIDATE`. `attemptPromotion` and `runPromotion` → `REVOKED_CANDIDATE`. Task status is not `promoted`. The forensic bundle stays `tainted: true`. |

## P1-2 CLOSED — RELEASED does not resurrect old authority

Before: the same permit after `RELEASED` returned `PROMOTED` and `canonical_write`, and `tainted` was cleared.

After:

| Attack | Result |
|---|---|
| Old permit after RELEASED | `AUTHORITY_EPOCH`. Unconsumed. No `canonical_write`. `runPromotion` returns 409 before Artifacts. |
| Old ACCEPT after RELEASED | `issuePermit` of the blocked SHA → `AUTHORITY_EPOCH`, permit null. `tainted` stays true. |
| Evidence submitted during quarantine | Still blocked after RELEASED. `submitEvaluation` throws `salvage requires a new SHA`. |
| REVOKED | Never promotes. Same as P0-2. |
| Fresh SHA after RELEASED | Push applied, new evidence `tainted: false`, seam `ACCEPT`, new permit `ISSUED`, `PROMOTED` with `canonical_write` of the new SHA. A later presentation of the old permit is still `AUTHORITY_EPOCH`. |

An old permit does not become valid again. The void list is the permit ids captured at quarantine entry, not a timestamp.

Amendment: `specs/amendments/quarantine-authority-epoch-v1.md`. Frozen specs were not edited. Salvage stays the frozen rule: new SHA, new evidence, full reevaluation.

## P1-1 CLOSED — a stale push does not rewind latest_commit

Before: tip `empty-republish-sha`, then a different event `before=base123`, `after=old-sha`, outcome `APPLIED_NEW`, tip becomes `old-sha`.

After (`advances only from the observed tip and does not rewind`, pass):

| Delivery | Outcome | Tip |
|---|---|---|
| `base123 → sha-b`, then `sha-b → sha-c` | `APPLIED_NEW`, `APPLIED_NEW` | `sha-c` |
| `base123 → sha-b` again | `ACK_DUP`, same state object | `sha-c` |
| `unrelated-before → unrelated-after` | `REQUIRES_RECONCILIATION` | `sha-c` |
| `somewhere-else → sha-c` | `ALREADY_OBSERVED` | `sha-c` |
| `sha-c → sha-d` | `APPLIED_NEW` | `sha-d` |
| unknown repo | `REJECTED_UNKNOWN_REPO` | `sha-d` |
| first event whose `before` is not `fork_base` | `REQUIRES_RECONCILIATION` | unchanged |
| no `latest_commit` and no `fork_base` | `REQUIRES_RECONCILIATION` | unchanged |

The queue consumer acknowledges `REQUIRES_RECONCILIATION` and `REJECTED_UNKNOWN_REPO` and throws on any other outcome. An unknown repository is not labeled as out-of-order delivery.

Amendment: `specs/amendments/queue-causal-tip-v1.md`. Frozen specs were not edited. This was not observed on Cloudflare Queue.

## P2

Closed in this repair: `threeWayMerge` passes `minimalEnv()` to `git merge-file`. The regression sets `AGENT_SERVICE_TOKEN`, `MADGRIX_AGENT_SECRETS`, `CONTROL_SERVICE_TOKEN`, and `EVALUATION_SERVICE_TOKEN` on the parent and asserts they are absent from the child env.

Still open, from the audit, not changed here:

- `blobHasConflictMarkers` and a NUL before or inside a marker line
- a blob path that itself contains a newline
- `resolutionSection` under a `PENDING` stamp
- a stored permit winner printed next to a plate of `NONE`
- `docs/ENTRY_BLUEPRINT.md` `ExternalVerifier` slot
- a freshly hashed bundle that copies an older bundle's gate booleans

Judge-facing wording corrected after this retest, with no behavior change: `docs/DEMO_SCRIPT.md` narrates 345 tests and 106 suites and does not say `npm test` needs `fleet`; `scripts/run-fork-crew.mjs` says `fleet validate` runs only when `MADGRIX_FLEET_BIN` is set; `docs/GIT_PROBLEMS.md` says TheUstad is the frozen-baseline check; `docs/PRODUCTION_DEPLOYMENT.md` says at-least-once delivery plus idempotent dedupe; `README.md` says the production path is in this tree and has not been executed on Cloudflare.

## Not done

No deploy. No merge to `main`. No Cloudflare resource created. `npm run build` was not run because the Docker engine was not running.
