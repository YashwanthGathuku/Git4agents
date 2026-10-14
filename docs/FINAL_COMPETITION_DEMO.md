# MADGRIX — final Cloudflare competition demo runbook

Use this for the final 5–10 minute submission recording. Cloudflare asks for a 5–10 minute video that demonstrates what was built, what it enables agents/developers to do, and how it works.

## One sentence

> **Agents can race. Only evidence can ship.** MADGRIX is the governed canonicalization layer for autonomous software development: agents work concurrently in isolated Git state, but only an independently evaluated, explicitly authorized exact software state can become canonical.

## Recording sources

### Live source of truth

After deploying `competition/mission-control`, open:

```text
https://madgrix.ygathuku96.workers.dev/tasks/task_79b1f9d610e94d8e95daa503/graph
```

`cloudflare.config.ts` pins exactly this recorded run as `MADGRIX_PUBLIC_DEMO_TASK_ID`. The route is read-only without a token only for that task. All other task graph routes retain agent/control authentication.

Run 4 facts already recorded in the repository:

- task: `task_79b1f9d610e94d8e95daa503`
- baseline: `b3ee4c862dcc6996678dc25c1de5c49b060fa9d4`
- combined / authorized / promoted SHA: `d55332b544992a2e033ca03fa54972c5283eef73`
- TheUstad: `FINAL VERIFIED`
- orchestrator: `MADGRIX_LIVE_E2E_OK`
- offline promotion bundle: `VERIFIED`
- canonical repository: real Cloudflare Artifacts `starter-repo`

### Conflict source

Use the local conflict fixture only when showing a deliberate conflict. Keep the `Fixture/demo input` banner visible. Never present it as run 4 or as a Cloudflare call.

```bash
node scripts/render-demo-graph.mjs
```

### Live-run recording

The 88-second run-4 capture is the proof that the end-to-end path actually executed. Use a short excerpt rather than replaying the full clip if the narrated recording is approaching ten minutes.

Recorded location from the live-run journal:

```text
~/workspace/madgrix-live-run/video/git4agents-live-run4.mp4
```

## 7–8 minute narrative

### 0:00–0:40 — The problem

Screen: live Mission Control, top of run 4.

Say:

> "Git tells us what changed. That is not enough when autonomous agents can create, review, and ship changes without a human watching every operation. We need to know why work started, what authority each agent had, what other attempts existed, what evidence was produced, which state was authorized, and whether that exact reviewed state is what became canonical."

> "MADGRIX is that control plane. Agents can race. Only evidence can ship."

Point to the live task id, baseline, status and the Mission Control summary.

### 0:40–1:35 — Concurrent autonomous work

Screen: CrewContender + Semantic clearance.

Say:

> "This task ran on Cloudflare. One parent coordinated concurrent sub-agents on isolated contender state. They did not receive a credential that can write canonical Git. Their WorkClaims record intent, baseline, scope and lease before their work can be admitted."

> "Semantic clearance is not a new permission system layered on top. It is a read-only projection of the authority records MADGRIX already stores. CLEAR, CAUTION or HOLD summarizes recorded WorkClaim interactions; the verdict and exact-state permit remain the real gates."

If the live task has no conflict report, say exactly that. Do not imply a HOLD occurred in run 4.

### 1:35–2:25 — What Cloudflare contributes

Screen: keep live task open; optionally show README architecture diagram.

Say:

> "Cloudflare Artifacts is not just storage here. It gives MADGRIX isolated Git repositories and scoped credentials for contender work while canonical Git stays separate. Artifacts push events enter a Queue. A TaskAuthority Durable Object serializes authority state. The promotion path is a Workflow and trusted Container, and only that path gets canonical write authority."

> "So the architecture separates producing code, evaluating code, authorizing code and shipping code. No agent gets all four powers."

### 2:25–3:15 — Conflict before merge

Screen: local conflicted fixture, banner visible.

Say:

> "Now this is deliberately a local fixture, because I want to show a conflict state cleanly. Human Git usually exposes conflict at merge time. MADGRIX records the collaboration conflict while work is still represented as claims and contributions."

Point to the stored risk/layers and then to Composition.

> "The important invariant is here: CONFLICTED means promotable candidate NONE. A member contribution SHA does not become a candidate just because it exists. Resolution has to create a new software state."

Switch to resolved fixture and point to the new candidate.

> "The resolved SHA is new. It is still not allowed to ship merely because the conflict disappeared. It still needs independent evidence, a verdict and an exact-state permit."

### 3:15–4:05 — Blind verification and non-compensatory gates

Screen: return to live run-4 Mission Control. Scroll to Evaluation + Blind verifier board + Verdict Seam.

Say:

> "Evaluation is independent of the writer. Baseline, scope, test integrity, hidden tests, regression tests, security, provenance, semantic checks and tamper state are separate gates. A security failure cannot be outweighed by a style score."

> "The blind verifiers commit before candidate exposure, reveal later, and submit signed reports against blind candidate labels. The public page shows the protocol progress but deliberately does not expose signatures, keys, private reasons or the candidate-label-to-SHA mapping."

Point to verdict.

> "Only the Verdict Seam can select a winner. It can also reject, abstain, escalate or quarantine."

### 4:05–5:05 — Exact-state authorization

Screen: Authorization + Promotion.

Say:

> "An ACCEPT verdict still cannot push main. MADGRIX issues a single-use permit bound to the candidate SHA, baseline, tree digest, evaluation bundle hash, policy and expected destination HEAD. If main moves, that authorization is stale. Rebase creates a new SHA and that new state must be evaluated again."

Point to authorized SHA and promoted SHA.

> "The promotion container fast-forwards canonical Git to the authorized candidate itself. It does not create a different merge commit after review."

### 5:05–6:00 — WHY CANONICAL

Screen: `Why canonical?`.

Say:

> "This is the question ordinary Git history cannot answer by itself: why is this exact state canonical?"

Walk down the fields:

- task intent
- task id
- baseline
- producer / contender
- selected candidate
- number of competing evaluations
- verdict
- permit
- evaluation binding
- destination-head binding
- canonical destination
- final SHA

Finish:

> "For this recorded run the authorized candidate and shipped commit are the same exact SHA. What was authorized is what was shipped."

Do not call the HTML page an offline verifier. It is an explanation of stored records.

### 6:00–6:45 — Proof the gates can say no

Screen: `docs/LIVE_RUN_RESULTS.md` or the relevant journal section.

Say:

> "A governance system that only says yes is theater. Run 3 attempt 1 was rejected because the WorkClaim omitted `.madgrix/**` while the candidate touched those paths. Nothing was promoted. We corrected the claim and ran the same gates again."

Then mention the head-move harness:

> "The separate head-move scenario also proves an old permit cannot silently authorize a rebased or destination-shifted state."

Do not present either as a live Cloudflare fault-injection benchmark unless that exact run was live.

### 6:45–7:30 — Real Cloudflare proof and close

Screen: short run-4 video excerpt or `docs/LIVE_RUN_RESULTS.md`, then back to Mission Control top.

Say:

> "This was not a single mocked happy path. MADGRIX has four recorded end-to-end Cloudflare promotions. Each run began from the previous run's canonical SHA. Run 4 finished `MADGRIX_LIVE_E2E_OK`, TheUstad returned `FINAL VERIFIED`, the promotion bundle verified offline, and a fresh Artifacts `git ls-remote` independently showed canonical main at the promoted SHA."

Close:

> "Git was built to track changes to code. MADGRIX coordinates, verifies and authorizes changes made by populations of autonomous agents—and proves why one exact software state earned the right to become real. Agents can race. Only evidence can ship."

Stop.

## Camera checklist

Before recording:

- deploy the branch and open the public run-4 Mission Control URL in a private/incognito browser to prove it needs no secret;
- confirm `/health` is 200;
- confirm another random `/tasks/<id>/graph` still returns auth-required/not-found according to the route contract;
- keep terminal/font large;
- hide service tokens, Git credentials, Cloudflare API tokens and local secret files;
- do not open browser network panels containing authorization headers;
- keep the local conflict fixture's banner visible;
- have the 88-second run-4 video queued as backup evidence;
- have `docs/LIVE_RUN_RESULTS.md` queued to the four-run table;
- record one continuous narrated take if possible.

## Submission page fields

Cloudflare requires:

- project name
- project vision
- how Cloudflare was used
- 5–10 minute demo video
- permissively licensed open-source repository URL
- instructions to run/try the project

The repository is MIT licensed.

### Project name

`MADGRIX — Git for Autonomous Agents`

### Project vision

`Agents can race. Only evidence can ship. MADGRIX is an agent-native Git control plane that coordinates concurrent autonomous work, records intent and authority before action, independently evaluates competing software states, and allows only the exact evidence-backed state authorized by its Verdict Seam to become canonical.`

### How Cloudflare was used

`MADGRIX uses Cloudflare Artifacts as isolated Git state for canonical and contender repositories; Artifacts push events feed Cloudflare Queues; Workers expose the control plane and consume those events; TaskAuthority and promotion state are held by Durable Objects; a Cloudflare Workflow provides one durable promotion instance per exact-state permit; and a trusted Cloudflare Container performs the only canonical Git write. The recorded competition run completed this path end-to-end on real Cloudflare infrastructure.`

### Try it

After the competition branch is deployed:

```text
Live read-only Mission Control:
https://madgrix.ygathuku96.workers.dev/tasks/task_79b1f9d610e94d8e95daa503/graph

Repository:
https://github.com/YashwanthGathuku/Madgrix
```

For a full local verification path, follow the README's Node 24 / npm / Git / Docker instructions and run the documented test, slice, head-move and offline-verifier commands.
