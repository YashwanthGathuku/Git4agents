# Competition Demo Script — Git4agents / MADGRIX (~7–8 minutes)

This script is for the **final competition video**. Use the already-recorded Run 4
evidence; **do not rerun `live:e2e` just to record the demo**. The goal is to show
judges the real Cloudflare path, explain why it matters, and finish with independently
verifiable proof.

Run 4 facts:

- task: `task_79b1f9d610e94d8e95daa503`
- baseline: `b3ee4c862dcc6996678dc25c1de5c49b060fa9d4`
- combined / promoted SHA: `d55332b544992a2e033ca03fa54972c5283eef73`
- crew: one parent + two scripted sub-agents, one contender
- TheUstad: `FINAL VERIFIED`
- result: `MADGRIX_LIVE_E2E_OK`
- offline promotion bundle: `VERIFIED`

The demo sub-agents are scripted commands. Say that plainly: the video demonstrates
**coordination, authorization, evaluation, exact-state promotion, and proof**, not LLM
intelligence.

---

## 0:00–0:40 — The problem

**Show:** repository title / README opening.

**Say:**

> “Git tells us what changed. When autonomous agents write code concurrently, the
> harder question is: who was allowed to change what, what evidence was checked, who
> decided which state could ship, and did the exact reviewed state actually reach
> canonical Git? Git4agents, powered by MADGRIX, adds that governed promotion layer.”

Keep the opening short. Do not start with implementation details.

## 0:40–1:30 — Architecture

**Show:** the Mermaid architecture in `README.md` (rendered on GitHub) or the equivalent
architecture slide.

Walk left to right:

1. parent + sub-agents work in a scoped contender fork;
2. Cloudflare Artifacts emits real push events;
3. `madgrix-events` Queue delivers them to the Worker;
4. `TaskAuthority` owns task state, claims, evidence, verdict, permit, and ledger;
5. independent evaluation + blind signed verifier reports feed Verdict Seam;
6. the exact-state permit starts `PromotionWorkflow`;
7. the promotion Container is the canonical Git writer;
8. the authority emits a signed `promotion.bundle`;
9. a separate verifier checks it offline against a pinned key.

**Say:**

> “The important boundary is that agents never get canonical write authority. The
> promotion path is the sole writer, and it can only ship the exact permit-bound state.”

## 1:30–2:00 — Real Cloudflare, not a mock

**Show briefly:** Cloudflare dashboard/resources if available:

- Worker `madgrix`;
- Artifacts namespace `default`;
- Queue `madgrix-events`;
- `TaskAuthority`, `PromotionContainer`, `ModuleAgent`;
- Workflow `madgrix-promotion`;
- promotion container.

Do not expose secrets, tokens, account-private values, or environment files.

**Say:**

> “This is the deployed stack used by the recorded run. The live E2E intentionally does
> not use `FakeArtifacts`.”

## 2:00–4:40 — Run 4: show the real 1/9 → 9/9 execution

**Show:** the saved Run 4 terminal replay/log. Pause or annotate at each important step.

### 1/9 — Freeze the task

> “Intent, baseline, behavior contract, and verifier identities are frozen before
> candidates exist.”

### 2/9 — Commit blind references

> “Verifiers commit their reference reports before candidate exposure, so they cannot
> rewrite the standard after seeing the answer.”

### 3/9 — Fork once; run the crew

> “One parent coordinates two scripted sub-agents concurrently on one contender fork.
> They have bounded scopes; they do not hold canonical write authority.”

If visible, point out that the per-run lines in `src/api/runs.txt` and
`src/ui/runs.txt` guarantee each demo run creates fresh work on top of the previous
baseline.

### 4/9 — Real push event delivery

> “The Git push is observed through Cloudflare Artifacts events, delivered through the
> Queue, and ingested by the task authority.”

### 5/9 — Independent evaluation

> “Evaluation gets a read-only credential for the immutable candidate SHA. Mandatory
> gates are non-compensatory.”

### 6/9 — Blind reports + TheUstad

Stop long enough for the viewer to read:

```text
TheUstad gate: FINAL VERIFIED
```

> “TheUstad is a frozen-baseline integrity gate here: it confirms the parent fork is still at the expected baseline and clean before composition. It does **not** semantically judge the combined candidate; the independent evaluation and blind verifier reports do that.”

### 7/9 — Verdict Seam + exact-state permit

> “An ACCEPT does not mean ‘push something equivalent.’ It produces a single-use permit
> bound to the exact candidate/tree, evaluation bundle, policy, baseline, and destination
> head.”

### 8/9 — Canonical promotion

> “The Workflow and promotion Container fast-forward canonical Git to the reviewed
> candidate SHA itself. No merge commit is invented after review.”

### 9/9 — Signed evidence + offline verification

> “After the write is confirmed, the authority signs the promotion evidence and the
> separate verifier checks it against the pinned authority key.”

End this section by showing:

```text
MADGRIX_LIVE_E2E_OK
FINAL VERIFIED
VERIFIED
```

## 4:40–5:25 — Prove reviewed SHA == shipped SHA

**Show:** Run 4 result / journal and the Artifacts `git ls-remote` confirmation if it is
in the recording. Highlight:

```text
d55332b544992a2e033ca03fa54972c5283eef73
```

**Say:**

> “This SHA is the combined candidate that passed the gates, and it is also the SHA at
> canonical `main`. The protocol is designed to make that identity check mechanical,
> not a trust-me statement.”

Do not spend time reading the full hash aloud.

## 5:25–6:10 — Offline proof

**Show:** the verifier output slowly enough to read:

```text
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

**Say:**

> “The verifier does not trust a key supplied by the bundle. It uses the authority key
> pinned out of band. That means the promotion evidence remains independently
> checkable after the run.”

## 6:10–6:50 — Show that the gates can reject work

**Show:** the journal section for Run 3 attempt 1 or a concise screenshot.

**Say:**

> “The successful runs are not proof that the system always says yes. Earlier the same
> live path rejected an attempt because the declared claim scope omitted `.madgrix/**`.
> Nothing was promoted. We corrected the claim and reran; the same gate then passed.
> That is enforcement, not a decorative audit log.”

If time permits, mention the local `HEAD-MOVE OK` harness as the reproducible proof that
a destination move expires the old permit and forces rebase + re-evaluation. Do not
present the local harness as a live Cloudflare fault-injection run.

## 6:50–7:20 — Why not plain Git?

**Show:** `docs/LIVE_RUN_RESULTS.md` comparison table.

**Say:**

> “Plain Git completed the same file changes in seconds, but it gave us none of the
> governance guarantees: no enforced work scope, no independent evidence, no blind
> verdict, no exact-state permit, no signed promotion proof. MADGRIX adds those
> guarantees before canonical write.”

Do not frame the ~30-minute governed run as a speed benchmark. It is a measured demo
run dominated by polling/wait windows, and the comparison deliberately separates
machine time from the human review cost that plain Git leaves unresolved.

## 7:20–7:45 — Close

**Show:** architecture again, ending on `VERIFIED`.

**Say:**

> “Forks are becoming commodity. Git4agents focuses on what happens after agents can
> write: adjudication, authority, exact-state enforcement, and verifiable history. Git
> records the change. MADGRIX records why that exact change was allowed to ship.”

---

## Recording checklist

- [ ] Use the saved Run 4 recording/log; do not create a fifth run for the video.
- [ ] Keep the final video between 5 and 10 minutes.
- [ ] Terminal text is readable at normal playback speed.
- [ ] Show architecture before the terminal output so judges know what they are seeing.
- [ ] Never show service-token values, Artifacts credentials, signing private key, or
      the contents of the private secrets file.
- [ ] Say “parent + two scripted sub-agents, one contender,” not “three independent
      model agents” and not “three contender repositories.”
- [ ] Show `FINAL VERIFIED`, the promoted SHA, `MADGRIX_LIVE_E2E_OK`, and offline
      `VERIFIED`.
- [ ] Keep local slice/head-move/benchmark evidence clearly labeled as local harness
      evidence.
- [ ] End with the public repository/branch and submission link/QR only if desired.
