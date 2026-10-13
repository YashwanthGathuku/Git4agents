# MADGRIX final release gate retest

Retest date: 2026-10-13

This file records the local retest of the terminal promotion-reservation abort. It is not a claim that the system is secure or production ready.

## SHAs

| | SHA |
|---|---|
| Old failing SHA | `417663760d0ac1355efc8c09699db8bffb684ce9` |
| New code SHA | `5ba2f078ed730a8b3be3d4abd3bdfb875f8e1933` |
| Tip SHA | the commit that adds this file; its only parent is the new code SHA |

Tree of the new code SHA: `72f64908456682f90f8e4c1a3648c8c4c7c6d02e`.

The old failing SHA returned 409 `EXPIRED_HEAD_MOVED` for the stale permit and left that reservation `IN_FLIGHT`. A later rebased permit then received 409 `PROMOTION_IN_FLIGHT` and was not written. The stale SHA was not written.

## What the code SHA changes

`abortReservedPromotion` records status `ABORTED` when the promotion container returns a 409 whose `container/promote.sh` path exits before `git push`:

- `EXPIRED_HEAD_MOVED` (exit 42)
- `TREE_MISMATCH` (exit 43)
- `UNSUPPORTED_TREE_ENTRY` (exit 46)
- `BASELINE_MISMATCH` (exit 47)
- `UNRESOLVED_CONFLICT` (exit 48)

The permit stays unconsumed. The reservation is kept, with `abort_reason` set. One `promotion_reservation_aborted` ledger entry stores `permit_id`, `candidate_sha`, `promotion_nonce`, and `terminal_outcome`. There is no `canonical_write`. `beginPromotion` of that same permit returns the stored outcome and does not create another reservation. Only a reservation whose status is `IN_FLIGHT` blocks a different permit.

`PUSH_REJECTED` (exit 44) is not abortable. `promote.sh` maps every failed `git push` to that outcome, so a dropped status after the remote accepted the update is not distinguishable from a rejected update. HTTP 502, HTTP 503, a network exception, a container timeout, an unknown container result, and a successful canonical write whose finalize response was lost also stay `IN_FLIGHT`. The lost-finalize retry still reuses the same reservation, reconciles `ALREADY_WRITTEN`, and finalizes once.

If the abort RPC fails, `runPromotion` returns 503 `promotion_abort_pending`. The reservation stays `IN_FLIGHT` until a retry lands the abort. A successful abort is then returned as the original 409.

`npm run headmove` runs the library scenario and Worker `runPromotion`. It prints `HEAD-MOVE OK` only after both refuse the stale SHA and promote only the rebased SHA.

Amendment: `specs/amendments/promotion-terminal-abort-v1.md`. Frozen specs were not edited.

## Commands

WSL Ubuntu, Node v24.21.0 at `/home/gathu/node-v24.21.0-linux-x64/bin/node`, npm 11.19.0. The tree was `git archive` of `72f64908456682f90f8e4c1a3648c8c4c7c6d02e` with `core.autocrlf=false` and `core.eol=lf`, extracted at `/home/gathu/madgrix-gate-abort`. `container/promote.sh` in that extract was 7330 bytes and contained no CR. `src/lib/task-state.ts` and `src/worker/index.ts` contained no CR.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx tsc --noEmit -p tsconfig.node.json` | exit 0 |
| `npm test` | 368 tests, 112 suites, 368 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo, `duration_ms` 17020.127456 |
| `npm run slice` | exit 0. Offline verifier printed `VERIFIED`. `SLICE OK` |
| `npm run headmove` | exit 0. `HEAD-MOVE OK: the library path and Worker runPromotion both refuse the stale SHA and promote only the rebased SHA.` |
| `npm run bench` | exit 0. Trials 26/26. `zero_tolerance_ok: true` |
| `node --test test/promotion-fixtures.test.ts` | 56 tests, 29 suites, 56 pass, 0 fail, `duration_ms` 8649.109803 |
| `node --test test/final-authority-invariants.test.ts` | 22 tests, 7 suites, 22 pass, 0 fail, `duration_ms` 495.483108 |
| `node --test test/promotion-terminal-abort.test.ts` | 11 tests, 1 suite, 11 pass, 0 fail, `duration_ms` 418.03894 |

The 368 is the previous 357 plus the 11 reservation-abort tests. Those 11 are also the dedicated `node --test` run above.

## E-headmove-worker-recovery

The independent probe was not committed. It is the same 129 checks that audited `417663760d0ac1355efc8c09699db8bffb684ce9`, re-pointed at `/home/gathu/madgrix-gate-abort` and run with the same Node.

`AUDIT_CHECKS 129 failed 0`

`PROBE_EXIT:0`

`E-headmove-worker-no-stale-write` passed. `runPromotion` of the stale permit returned 409 `EXPIRED_HEAD_MOVED`. The permit stayed unconsumed. Canonical HEAD stayed the moved head. The reservation status was `ABORTED`.

`E-headmove-worker-recovery` passed. After rebase, fresh evidence, and a fresh permit, `runPromotion` returned 200 `PROMOTED`. Canonical HEAD was the rebased SHA. The old reservation stayed `ABORTED`.

## Counts

P0 = 0

P1 = 0

The previous P1 was that Worker recovery check. It passes on the new code SHA. The probe reported no other finding.

## Build

`npm run build` (`cf build`) of the new code SHA, from a Windows LF extract of tree `72f64908456682f90f8e4c1a3648c8c4c7c6d02e`. Node v24.21.0, npm 11.19.0, Docker 29.8.2. `container/promote.sh` in that extract was 7330 bytes and contained no CR. Exit 0.

Worker bundle `.cloudflare/output/v0/workers/default/bundle/index.js` is 251636 bytes, SHA-256 `2f6c23574309774e3135b5f737a61834267e229a4360ba9b6b3763661f79ecc7` (Vite reported 251.63 kB).

Container image `docker.io/cloudflare-build/cdc8ec1ccaf2/madgrix-promotion:22041d923199`, manifest `sha256:7fbd2f431b6f782d54ccd604d0d6bdd0b7bb7e0f18f91df93d44273f1b99de2c`. Every Dockerfile step was `CACHED`. `container/` did not change in this repair. The image was not started and was not pushed.

Cloudflare: NOT RUN

Nothing in this pass was deployed. `main` was not merged.

LOCAL RELEASE GATE: PASS
