/**
 * Static replay data for GET /replay, extracted from the recorded live run
 * task_6cdb2087a04e389edc87de1c (/workspace/live-run-final-4.log, its signed
 * bundle and its offline verify output). Only public fields are kept: ledger
 * kinds, timestamps and hashes, the run's progress lines and the verify
 * report. No token, secret, payload or signature is included.
 */
export const LIVE_RUN = {
 "source": "live-run-final-4 (task_6cdb2087a04e389edc87de1c)",
 "task_id": "task_6cdb2087a04e389edc87de1c",
 "ship": {
  "repo": "starter-repo",
  "commit": "fc9c1e7084ad14067012a56e68bd8f4c5bdc85c2",
  "tree_sha256": "3f71b726834aa2a0709412f5a76c0dba4cc5d7fa0a9016717f48b63257ece4d8",
  "base": "3b71d3a93e41fde8716ed411c8e3be3abb684be6",
  "parent": "a6dcb9d56e7bc0722ab737bbd9e0732ead1a948e",
  "permit_id": "e2d3688622a2e79b4069f7ead56610eb5ff9d4e689d936a6a4656c1b830391fc"
 },
 "ledger_head": "51ffaeb0200b1b82ad943fd70cffc8e26951c70c3396c8dc93399e8c92403a7d",
 "ledger": [
  {
   "seq": 0,
   "ts": "2026-10-14T13:29:06.301Z",
   "kind": "authority_created",
   "entry_hash": "ba86cf9682d4b144e2bfdec6647e9ebba59ad6b5222460f14aec9cae976a65c6",
   "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000"
  },
  {
   "seq": 1,
   "ts": "2026-10-14T13:29:06.623Z",
   "kind": "verifier_keys_registered",
   "entry_hash": "04cb5e6bb23f47e6fcf4b440d63c9844b04cb4eaa20d9d874604ad56a688e8a7",
   "prev_hash": "ba86cf9682d4b144e2bfdec6647e9ebba59ad6b5222460f14aec9cae976a65c6"
  },
  {
   "seq": 2,
   "ts": "2026-10-14T13:29:06.623Z",
   "kind": "operator_keys_registered",
   "entry_hash": "aaf6597a44dd3a47e470fc684bb561719f144bc77292b6e94ee7fd5e6744382b",
   "prev_hash": "04cb5e6bb23f47e6fcf4b440d63c9844b04cb4eaa20d9d874604ad56a688e8a7"
  },
  {
   "seq": 3,
   "ts": "2026-10-14T13:29:06.623Z",
   "kind": "agents_enrolled",
   "entry_hash": "5f3779d7b3ed7f1cefe45974aa5a03dc7158d17629e390f1123613a628c1666d",
   "prev_hash": "aaf6597a44dd3a47e470fc684bb561719f144bc77292b6e94ee7fd5e6744382b"
  },
  {
   "seq": 4,
   "ts": "2026-10-14T13:29:06.699Z",
   "kind": "verifier_committed",
   "entry_hash": "6c5beadf02189754d102892e8fd0ead3e1386381bcd6747ec29b2434f130c1b5",
   "prev_hash": "5f3779d7b3ed7f1cefe45974aa5a03dc7158d17629e390f1123613a628c1666d"
  },
  {
   "seq": 5,
   "ts": "2026-10-14T13:29:06.812Z",
   "kind": "verifier_committed",
   "entry_hash": "b5ed5e925b728b0df924934b904a913477d4605c78930d2ced83afb8accebdc7",
   "prev_hash": "6c5beadf02189754d102892e8fd0ead3e1386381bcd6747ec29b2434f130c1b5"
  },
  {
   "seq": 6,
   "ts": "2026-10-14T13:29:06.893Z",
   "kind": "verifier_committed",
   "entry_hash": "e49232a8dae67e9cc53d9e06b3ef8ff7387573bc4934b31c7d8036bb79764b05",
   "prev_hash": "b5ed5e925b728b0df924934b904a913477d4605c78930d2ced83afb8accebdc7"
  },
  {
   "seq": 7,
   "ts": "2026-10-14T13:29:07.256Z",
   "kind": "claim_registered",
   "entry_hash": "73423633dffece0e6d3a10ca43a8f86fac96327442976567cfeda99a66d191be",
   "prev_hash": "e49232a8dae67e9cc53d9e06b3ef8ff7387573bc4934b31c7d8036bb79764b05"
  },
  {
   "seq": 8,
   "ts": "2026-10-14T13:29:10.344Z",
   "kind": "contender_registered",
   "entry_hash": "4a03129e4f32a3e1a60b1206095d9a39e5a244cdd2b808f68edaaad4bc42bb78",
   "prev_hash": "73423633dffece0e6d3a10ca43a8f86fac96327442976567cfeda99a66d191be"
  },
  {
   "seq": 9,
   "ts": "2026-10-14T13:29:13.020Z",
   "kind": "claim_registered",
   "entry_hash": "67b70cf5f691c3d70e7c8a50b67421dc3dc576a3b4d85060b8e4ebd71b6f9b87",
   "prev_hash": "4a03129e4f32a3e1a60b1206095d9a39e5a244cdd2b808f68edaaad4bc42bb78"
  },
  {
   "seq": 10,
   "ts": "2026-10-14T13:29:13.089Z",
   "kind": "claim_registered",
   "entry_hash": "921979928721699e8ce6cb0e82cf08a50df7252e22f7f30f7b0f90663d620529",
   "prev_hash": "67b70cf5f691c3d70e7c8a50b67421dc3dc576a3b4d85060b8e4ebd71b6f9b87"
  },
  {
   "seq": 11,
   "ts": "2026-10-14T13:31:04.247Z",
   "kind": "queue_event_reconciled",
   "entry_hash": "e780260e3aaa78fbc0ab95554ced5ab1c296721513dd6f58a6d921d42fba9a80",
   "prev_hash": "921979928721699e8ce6cb0e82cf08a50df7252e22f7f30f7b0f90663d620529"
  },
  {
   "seq": 12,
   "ts": "2026-10-14T13:31:06.360Z",
   "kind": "composition_recorded",
   "entry_hash": "e9583aaecbc947582804e38b4ee6b5df94eaaaf977fc7546eec4cbc9c8894225",
   "prev_hash": "e780260e3aaa78fbc0ab95554ced5ab1c296721513dd6f58a6d921d42fba9a80"
  },
  {
   "seq": 13,
   "ts": "2026-10-14T13:31:08.646Z",
   "kind": "evaluation_submitted",
   "entry_hash": "a51202fabda31ea5e9b5bd13652d851502e7f43a3d215e651d93a52a0f44699e",
   "prev_hash": "e9583aaecbc947582804e38b4ee6b5df94eaaaf977fc7546eec4cbc9c8894225"
  },
  {
   "seq": 14,
   "ts": "2026-10-14T13:31:08.799Z",
   "kind": "candidate_labels_assigned",
   "entry_hash": "d4590a55eb2cff2973a25965e8b93101c30dc079f40392085beee83659e61695",
   "prev_hash": "a51202fabda31ea5e9b5bd13652d851502e7f43a3d215e651d93a52a0f44699e"
  },
  {
   "seq": 15,
   "ts": "2026-10-14T13:31:08.879Z",
   "kind": "verifier_revealed",
   "entry_hash": "0366e2b0c810c6e21ec41bc1f3e36bf6f179ec3fa72f56a812991a22221f2387",
   "prev_hash": "d4590a55eb2cff2973a25965e8b93101c30dc079f40392085beee83659e61695"
  },
  {
   "seq": 16,
   "ts": "2026-10-14T13:31:08.950Z",
   "kind": "verifier_revealed",
   "entry_hash": "345893379911ab9ccf6f0e7d36e218b71e28afb158d432c3dcfaf8f2ff890a6d",
   "prev_hash": "0366e2b0c810c6e21ec41bc1f3e36bf6f179ec3fa72f56a812991a22221f2387"
  },
  {
   "seq": 17,
   "ts": "2026-10-14T13:31:09.028Z",
   "kind": "verifier_revealed",
   "entry_hash": "9b7c9b8869db1d6879b1c51abdd683e840a61f3658a1c38ad992cfb890cb25e7",
   "prev_hash": "345893379911ab9ccf6f0e7d36e218b71e28afb158d432c3dcfaf8f2ff890a6d"
  },
  {
   "seq": 18,
   "ts": "2026-10-14T13:31:09.129Z",
   "kind": "verifier_report_submitted",
   "entry_hash": "e3580f7492ca263fd970e37bb7d3da7ec4517b783368144cbfee80e6d8213829",
   "prev_hash": "9b7c9b8869db1d6879b1c51abdd683e840a61f3658a1c38ad992cfb890cb25e7"
  },
  {
   "seq": 19,
   "ts": "2026-10-14T13:31:09.213Z",
   "kind": "verifier_report_submitted",
   "entry_hash": "ea9656d0e12a918c57739036ece71044e916350174ede20c34411765a8575c58",
   "prev_hash": "e3580f7492ca263fd970e37bb7d3da7ec4517b783368144cbfee80e6d8213829"
  },
  {
   "seq": 20,
   "ts": "2026-10-14T13:31:09.299Z",
   "kind": "verifier_report_submitted",
   "entry_hash": "9618419728a4edfae438ac4614ad8a1a0a8ffbbe56f637f69ee4e4af5b32d7b4",
   "prev_hash": "ea9656d0e12a918c57739036ece71044e916350174ede20c34411765a8575c58"
  },
  {
   "seq": 21,
   "ts": "2026-10-14T13:31:09.443Z",
   "kind": "verdict_reached",
   "entry_hash": "1cd83df1ece3d9b207269ec7d60325334a4ba6cbdf98bf90a0f6f91d61c62483",
   "prev_hash": "9618419728a4edfae438ac4614ad8a1a0a8ffbbe56f637f69ee4e4af5b32d7b4"
  },
  {
   "seq": 22,
   "ts": "2026-10-14T13:31:09.738Z",
   "kind": "permit_issued",
   "entry_hash": "20bc8db0e7a04ae7a20b505cf98ac84d0e79e467e5d68a0827e4fc5ca4bcdcfd",
   "prev_hash": "1cd83df1ece3d9b207269ec7d60325334a4ba6cbdf98bf90a0f6f91d61c62483"
  },
  {
   "seq": 23,
   "ts": "2026-10-14T13:31:14.805Z",
   "kind": "promotion_reserved",
   "entry_hash": "f82d81de5beb967538a794a23880681df5206ab143dddd1aab44b34087b4ae13",
   "prev_hash": "20bc8db0e7a04ae7a20b505cf98ac84d0e79e467e5d68a0827e4fc5ca4bcdcfd"
  },
  {
   "seq": 24,
   "ts": "2026-10-14T13:31:21.159Z",
   "kind": "promotion_succeeded",
   "entry_hash": "51ffaeb0200b1b82ad943fd70cffc8e26951c70c3396c8dc93399e8c92403a7d",
   "prev_hash": "f82d81de5beb967538a794a23880681df5206ab143dddd1aab44b34087b4ae13"
  }
 ],
 "log": [
  "[Git4agents] preflight OK",
  "[Git4agents] 1/9 freeze task and verifier identities",
  "[Git4agents] 2/9 commit blind-verifier references before candidates exist",
  "[Git4agents] 3/9 parent forks once; sub-agents commit on that fork",
  "[Git4agents] parent parent forked mgx-task_6cdb2087a04e389edc87de1c-b78038773c45; sub-agents stay on this repo",
  "[Git4agents] sub-api (api) claimed src/api/** on mgx-task_6cdb2087a04e389edc87de1c-b78038773c45",
  "[Git4agents] sub-ui (ui) claimed src/ui/** on mgx-task_6cdb2087a04e389edc87de1c-b78038773c45",
  "[Git4agents] COMPOSED a6dcb9d56e7b (COMPOSED; sub-agents 5eb39dcba7dd, 38d6c8eb0cca)",
  "[Git4agents] waiting for the mgx-task_6cdb2087a04e389edc87de1c-b78038773c45 push subscription to start emitting",
  "[Git4agents] combined push was not applied; pushing again",
  "[Git4agents] 4/9 wait for real Artifacts push events through Queue \u2192 TaskAuthority",
  "[Git4agents] 5/9 evaluate immutable candidates in the independent evaluation domain",
  "[Git4agents] 6/9 reveal blind references and submit signed independent verdicts",
  "[Git4agents] 6/9 TheUstad gate: FINAL VERIFIED (combined fc9c1e7084ad14067012a56e68bd8f4c5bdc85c2)",
  "[Git4agents] 6/9 crew: concurrent_agents=3 (parent=1, sub_agents=2), contenders=1",
  "[Git4agents] 7/9 execute Verdict Seam and issue exact-state permit",
  "[Git4agents] 8/9 promote the exact reviewed commit to canonical Artifacts state",
  "[Git4agents] 9/9 fetch the authority-signed bundle and verify it offline"
 ],
 "verify": [
  "subject digest........ OK",
  "candidate digest...... OK",
  "chain integrity....... OK",
  "hidden evaluation..... PASSED",
  "policy digest......... OK",
  "destination base...... OK",
  "authority key......... PINNED",
  "signature............. VALID",
  "permit id............. RECOMPUTED FROM BOUND FIELDS",
  "ledger chain.......... OK",
  "",
  "VERIFIED"
 ]
} as const;
