# Admission proof v1

Status: implemented (src/lib/admission-proof.ts, recordComposition in src/lib/task-state.ts,
attachAdmissionProofs in scripts/lib/governed-resolution.mjs).

## Problem
The authority cannot run witnesses and cannot read git objects. Before this
amendment it accepted any `witness_report_sha256`/`verdict` the control plane
sent (a forged ADMIT) and any `candidate_sha` string (a commit that does not exist).

## Rule
When the authority has a pinned witness runner key (`Ctx.witnessRunnerPublicKey`,
from `MADGRIX_WITNESS_RUNNER_PUBLIC_KEY`: SPKI DER hex of an Ed25519 key), every
COMPOSED or RESOLVED record must carry `admission_proof`:

1. `commit_object` (base64): the candidate's raw commit object. The authority
   computes `sha1("commit <len>\0" + body)`; it must equal `candidate_sha`.
   The commit's parents must be exactly `{baseline} ∪ contributing_shas`
   (the shape `commitIndex` writes). A made-up SHA, or a real commit that is
   not this composition, fails.
2. `attestation` (when the record carries a witness verdict: RESOLVED
   `resolution.witness`, or COMPOSED `witness_check`): an Ed25519 signature by
   the runner key over the canonical JSON of
   `{format: "madgrix-witness-attestation/v1", task_hash, contender_id, baseline,
   contributing_shas (sorted), candidate_sha, candidate_tree, capsule_id,
   witness_manifest_sha256, witness_report_sha256, verdict, review_cleared_by}`.
   The authority rebuilds this payload from ITS view of the record (task hash
   from state, capsule from the recorded CONFLICTED, tree from the verified
   commit object), so a change to any field fails the signature.

The proof is checked and not stored: the ledger and promotion bundle are
unchanged, so offline `verify` does not re-check it.

## Runner
`run-fork-crew` signs with `MADGRIX_WITNESS_RUNNER_KEY_FILE` (PKCS8 PEM).
`governCrewResult(..., { witnessSigner })` attaches the proof.

## What this does not do
- Without a pinned key the authority behaves as before (the gap remains).
- The runner key holder can still sign any verdict: this moves trust from
  "whoever can call the control endpoint" to "whoever holds the witness runner
  key"; it does not let the authority re-run witnesses.
- The commit object proves the commit id, tree id and parents, not the tree's
  contents; tree contents are bound later by the evaluation's tree digest.
