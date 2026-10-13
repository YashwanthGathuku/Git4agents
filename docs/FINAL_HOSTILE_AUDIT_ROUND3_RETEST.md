# MADGRIX final hostile audit, round 3 retest

Retest date: 2026-10-13

Audited tree: `9fdc1336220995633700ad0d5f4710aa5b50b42a`. `src/` and `test/` are the same through the wording commit `fc2e545966cfd9f004578c9e1db0ac8d8f0b8a5b`. The audit of that tree reported P0=3 and P1=1. The four earlier authority attacks stayed refused.

Repair commits on `competition/final`:

| SHA | Subject |
|---|---|
| `9b1589e977afd202c1031b7367d5f1ac8b371077` | Reserve a promotion before the canonical write. |
| `010adbd7f028402d252f6642fa8f0b9530155a4a` | Check an omitted merge-artifact scan before the permit id. |

The green suite below ran on an LF extract of `010adbd` at `/home/gathu/madgrix-r3-010adbd`. `container/promote.sh` in that extract was 7330 bytes and contained no CR. An earlier extract of `9b1589e` failed one existing test: `test/unresolved-merge-artifact.test.ts` "C: a bundle that omits the scan is ineligible and gets no permit" returned `UNKNOWN_PERMIT` where the test requires `UNRESOLVED_CONFLICT`. `010adbd` runs the scan check before the permit-id check. A mismatched permit id still does not become a reservation.

Nothing in this pass was deployed, merged to `main`, or created in Cloudflare.

This file records the local retest. It is not a claim that the system is secure or production ready.

## How this run was executed

WSL Ubuntu, Node v24.21.0 at `/home/gathu/node24/bin/node`, `MADGRIX_FLEET_BIN` unset. The tree was `git archive` of `010adbd` with `core.autocrlf=false` and `core.eol=lf`.

`test/final-authority-invariants.test.ts` calls `reviewQuarantine`, `authorityRefusal`, `registerContender`, `recordComposition`, `submitEvaluation`, `runVerdictSeam`, `issuePermit`, `beginPromotion`, `finalizeReservedPromotion`, `attemptPromotion`, `ingestQueueEvent`, and `runPromotion`. `test/promotion-reservation.test.ts` calls `runPromotion` on the worker harness with a barrier after the reservation and before any Artifacts token or container call.

## Commands and counts

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx tsc --noEmit -p tsconfig.node.json` | exit 0 |
| `npm test` | 357 tests, 111 suites, 357 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo, `duration_ms` 14585.386388 |
| `npm run slice` | exit 0. Offline verifier printed `VERIFIED`. `SLICE OK` |
| `npm run headmove` | exit 0. `HEAD-MOVE OK: the same SHA is refused at the moved head; only the rebased SHA was promoted.` |
| `npm run bench` | exit 0. Trials 26/26. `zero_tolerance_ok: true` |
| `node --test test/promotion-fixtures.test.ts` | 56 tests, 29 suites, 56 pass, 0 fail, `duration_ms` 7648.240098 |
| `node --test test/final-authority-invariants.test.ts` | 22 tests, 7 suites, 22 pass, 0 fail, `duration_ms` 380.29336 |

The 357 is the previous 345 plus the new authority and reservation tests. The 22 authority tests are the previous 13 plus 9 for this round.

`npm run build` (`cf build`) from a Windows LF extract of the same commit, Node v24.21.0, Docker 29.8.2: exit 0. Worker bundle `.cloudflare/output/v0/workers/default/bundle/index.js` is 246395 bytes, SHA-256 `6325DD6B749A8CCBC1EDE0FB5DB005E9BB955397ED8539A59C4BE338122AE351` (Vite reported 246.39 kB). Every Dockerfile step was `CACHED`. The tagged image is `cloudflare-build/80fd7e28722d/madgrix-promotion:a7f2a284fffa`, id `sha256:7fbd2f431b6f782d54ccd604d0d6bdd0b7bb7e0f18f91df93d44273f1b99de2c`, size 263543740, created `2026-10-13T04:04:36.79277844Z`. That created time, size, and the seven layer digests match `madgrix-promotion:9fdc133` (`sha256:63d0b38ef338a2412e6184afedc1afeb42478ebfe87cc9ad642419caf045ef88`). `container/` did not change in this repair. The image was not started and was not pushed.

## P0-A CLOSED — runtime quarantine decision

Before (audit of `9fdc133`): `reviewQuarantine` accepted a registered operator signature over `revoked`, `released`, `REVOKED ` (trailing space), and `APPROVED`, with `recheck.passed === false`. The stored status was that string. Every value other than exact `RELEASED` set the contender to revoked. `authorityRefusal` matches only exact `QUARANTINED`, `REVOKED`, and `RELEASED`, so it returned null. `attemptPromotion` of the original permit returned `PROMOTED`, one `canonical_write` of `old-sha`, and consumed the permit. `runPromotion` did not return 409. It called `ARTIFACTS.get`. Exact `REVOKED` and exact `RELEASED` did not do this.

After (`rejects every decision that is not exactly RELEASED or REVOKED before mutation` and `a stored status outside QUARANTINED, REVOKED, and RELEASED cannot promote`, pass):

| Input | Result |
|---|---|
| Signed `released`, `revoked`, `REVOKED `, `APPROVED`, `""`, `null`, `undefined`, `{ status: "REVOKED" }`, `1`, recheck not passed | `reviewQuarantine` throws `exactly RELEASED or REVOKED`. State JSON is unchanged. Status stays `QUARANTINED`. |
| Same values stored on an existing record | `authorityRefusal` → `QUARANTINED_CANDIDATE`. `attemptPromotion` → `QUARANTINED_CANDIDATE`. No `canonical_write`. Permit unconsumed. `runPromotion` → 409 `QUARANTINED_CANDIDATE`, no Artifacts call, no container call. |

Exact `RELEASED` still requires the passing recheck. Exact `REVOKED` still follows the revocation path. Those cases remain in the earlier authority tests, which passed in this run.

Amendment: `specs/amendments/quarantine-decision-v1.md`. Frozen specs were not edited.

## P0-B CLOSED — one composition owner per task

Before: `compositionBlocks` returned false when `composition.contender_id` was not the contender being judged. After `recordComposition` bound `composed-sha` for contender 1, `registerContender` of contender 2 at `side-a-sha` was accepted. `submitEvaluation`, `runVerdictSeam` (`ACCEPT`, winner `side-a-sha`), `issuePermit` (`ISSUED`), and `attemptPromotion` (`PROMOTED`, `canonical_write` of `side-a-sha`, permit consumed) all succeeded. `authorityRefusal` for contender 2 was null.

After (`contender 2 cannot promote a member SHA, the old SHA, an arbitrary SHA, or the candidate`, pass):

Registration of contender 2 still returns `created: true`. Permits for contender 2 at `side-a-sha`, `old-sha`, `arbitrary-different-sha`, and `composed-sha` are issued before the composition record exists. After `recordComposition` names contender 1 and candidate `composed-sha`:

| Path for contender 2, each of those four SHAs | Result |
|---|---|
| `submitEvaluation` | throws `not the composition owner contender-1` |
| `runVerdictSeam` | `REJECT`, winner null, reason `UNRESOLVED_CONFLICT` |
| `attemptPromotion` of the pre-composition permit | `UNRESOLVED_CONFLICT`, no `canonical_write`, permit unconsumed |
| `runPromotion` | 409 `UNRESOLVED_CONFLICT`, no Artifacts call, no container call |
| `issuePermit` of `composed-sha` | `UNRESOLVED_CONFLICT`, permit null |

`authorityRefusal` for contender 1 and `composed-sha` stays null. A second composed contender is not represented. One `CrewContender` composition per task remains the model.

Amendment: `specs/amendments/task-composition-owner-v1.md`. Frozen specs were not edited.

## P0-C CLOSED — promotion reservation is the linearization point

Before: `runPromotion` read authority once, then minted tokens. On a real harness permit, the first `createToken` called the evidence route with `eval_file_changes` set. That stored `QUARANTINED` before the token mint returned. `runPromotion` still minted the tokens and called the promotion container once. Destination HEAD moved from the baseline to the candidate SHA. Finalize then returned `QUARANTINED_CANDIDATE` with effects `[]`. The permit stayed unconsumed. `runPromotion` returned 503 `promotion_written_but_finalize_pending`.

After:

| Case | Result |
|---|---|
| Quarantine before `beginPromotion` | `QUARANTINED_CANDIDATE`. No reservation. No `canonical_write`. Permit unconsumed. |
| Quarantine before `runPromotion` | HTTP 409 `QUARANTINED_CANDIDATE`. Artifacts `get` count 0. Container calls 0. Destination head stays the baseline. |
| Barrier after the reservation, then quarantine, then resume | At the barrier the container has not run, the reservation is `IN_FLIGHT`, and the permit is unconsumed. After resume: HTTP 200 `PROMOTED`, one container call bound to the reservation nonce and candidate SHA, destination head is that SHA, permit consumed, reservation `FINALIZED`. The quarantine record remains `QUARANTINED`. Ledger has `contender_quarantined` and `promotion_succeeded`. A later SHA is `QUARANTINED_CANDIDATE`. The answer is not `promotion_written_but_finalize_pending`. |
| Proof SHA is not the reservation | `RESERVATION_MISMATCH`. Permit unconsumed. Reservation stays `IN_FLIGHT`. |
| Finalize of the same proof | `PROMOTED`, one `canonical_write`. Replay is `ALREADY_CONSUMED`, no effects, one `promotion_succeeded`. |
| First finalize transport returns 503 after the container write | HTTP 503 `promotion_written_but_finalize_pending`. Head is the candidate. Permit unconsumed. Reservation `IN_FLIGHT`. Retry uses the same nonce, HTTP 200 `PROMOTED`, `reconciled_existing_write` true, head unchanged, one `promotion_reserved`, one `promotion_succeeded`. |
| A second permit while one reservation is `IN_FLIGHT` | `PROMOTION_IN_FLIGHT`. No second reservation. That permit stays unconsumed. |

`attemptPromotion` is `beginPromotion` plus immediate `finalizeReservedPromotion`. Slice replay still returns `ALREADY_CONSUMED` with no effects. Head movement still returns `EXPIRED_HEAD_MOVED` before a reservation is stored.

Amendment: `specs/amendments/promotion-reservation-v1.md`. Frozen specs were not edited. The container is not required to echo `promotion_nonce`. The worker refuses a result whose SHA, tree, or base differs from the reservation.

## P1-D CLOSED — empty push tip

Before: from tip `empty-republish-sha`, `before=empty-republish-sha` `after=""` was `APPLIED_NEW` and `latest_commit` became `""`. The following event `before=base123` `after=old-sha` was `APPLIED_NEW` and `latest_commit` became `old-sha`. `submitEvaluation` of `old-sha` was `RECORDED`.

After (`an empty after does not clear the tip, and a stale base push does not become current`, and `whitespace-only and zero object ids are not stored as the tip`, pass):

| Delivery | Outcome | Tip |
|---|---|---|
| tip `sha-c`, `before=sha-c`, `after=""` | `REJECTED_INVALID_EVENT`, ledger `queue_event_rejected_invalid` | `sha-c` |
| then `before=base123`, `after=sha-b` | `REQUIRES_RECONCILIATION` | `sha-c` |
| redelivery of the empty `after` | `ACK_DUP`, same state object | `sha-c` |
| `before=sha-c`, `after=sha-d` | `APPLIED_NEW` | `sha-d` |
| `after` is `" "`, newline, tab, space-tab, 40 zeros, or 64 zeros | `REJECTED_INVALID_EVENT` | `sha-c` |
| `after` is `null`, `undefined`, `0`, or `{ sha: "" }` | `REJECTED_INVALID_EVENT` | `sha-c` |

A direct push whose `before` is the non-empty tip and whose `after` is a different non-empty SHA stays `APPLIED_NEW`. The queue consumer acknowledges `REJECTED_INVALID_EVENT`.

Amendment: `specs/amendments/queue-nonempty-tip-v1.md`. Frozen specs were not edited. This was not observed on Cloudflare Queue.

## Previous hostile regressions

`test/final-authority-invariants.test.ts` still contains the earlier cases: wrong composition SHA, member SHA omitted from `contributing_shas`, `REVOKED`, old permit after `RELEASED`, evidence during `QUARANTINED`, stale Queue delivery, and the queue consumer ack set. That file passed 22 tests, 0 fail, in this run. `npm test` also passed `test/unresolved-merge-artifact.test.ts`. `npm run headmove` refused the same SHA at the moved head. Bench trials 17–18 record permit replay as `ALREADY_CONSUMED` with no effects, and trials 23–24 record destination head movement as `EXPIRED_HEAD_MOVED`.

Previous hostile regressions: PASS

## Not done

No deploy. No merge to `main`. No Cloudflare resource created or changed. The image was not started and was not pushed. A push of `competition/final` does not start GitHub Actions. CI runs on push to `main` and `codex/**`, and on `pull_request`. Draft PR #2 is conflicted, so `pull_request` workflows do not run.

P0-A: CLOSED
P0-B: CLOSED
P0-C: CLOSED
P1-D: CLOSED

Previous hostile regressions: PASS

Full test counts: `npm test` 357 tests, 111 suites, 357 pass, 0 fail, `duration_ms` 14585.386388. `node --test test/promotion-fixtures.test.ts` 56 pass, 0 fail. `node --test test/final-authority-invariants.test.ts` 22 pass, 0 fail. `npx tsc --noEmit` exit 0. `npx tsc --noEmit -p tsconfig.node.json` exit 0. `npm run slice` exit 0, `SLICE OK`. `npm run headmove` exit 0, `HEAD-MOVE OK`. `npm run bench` exit 0, `zero_tolerance_ok` true.

Build: `npm run build` exit 0. Worker bundle 246395 bytes, SHA-256 `6325DD6B749A8CCBC1EDE0FB5DB005E9BB955397ED8539A59C4BE338122AE351`. Image id `sha256:7fbd2f431b6f782d54ccd604d0d6bdd0b7bb7e0f18f91df93d44273f1b99de2c` retags the cached `container/` layers from `2026-10-13T04:04:36.79277844Z`. Not started. Not pushed.

Cloudflare: NOT RUN
