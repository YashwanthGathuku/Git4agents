# Git4agents

**The trust layer for agent-written code.**

[![tests](https://img.shields.io/badge/tests-439%20passing-2ea44f)](test) [![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![Cloudflare Workers](https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://madgrix.ygathuku96.workers.dev)

Agents can now write code faster than anyone can review it. Branch permissions say *who* may merge, not *which exact state* earned the right to ship.
Git4agents lets many agents work in parallel, but only one exact commit, checked by gates nobody can override, can become canonical.
Every promotion leaves a signed bundle you can verify offline, so "it passed review" is checkable instead of a claim.

**Live:** https://madgrix.ygathuku96.workers.dev · **◆ Trust board:** https://madgrix.ygathuku96.workers.dev/board · **＋ Bring your repo:** https://madgrix.ygathuku96.workers.dev/board/new · **Demo video:** _link to be added_ (script: [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md))

[![Git4agents landing page: hanging marquee, isometric repo mall preview, how-it-works steps, receipts of the real runs](docs/assets/landing.png)](https://madgrix.ygathuku96.workers.dev/)

[![Trust board mall: live cheater run, cheater-cal stopped by security and taken to the quarantine room, false-done-fay turned back at checkout, honest-ana drives off with the promoted SHA](docs/assets/board-cheater.gif)](https://madgrix.ygathuku96.workers.dev/board?scenario=cheater&autoplay=1)

[/board](https://madgrix.ygathuku96.workers.dev/board): each repo is drawn as an illustrated 2.5D isometric shopping mall: two storeys with a lit mezzanine, a glass atrium over the checkout court, shadows and depth. Agents walk in through the fork & enroll desk, visit stores (the repo's directories, signs named after real module paths), pick up items (the files they claimed; two shoppers at one shelf = overlap flagged), then queue at checkout where the gates run (blind eval, hidden tests, provenance). Stores **upgrade** as work lands (open → busy with lit windows → "landed ★" with an extra floor and flag) and **degrade** on gate failures or quarantine (dimmed, boarded windows, crack, caution tape). Honest shoppers drive off with the promoted SHA; the cheater is taken to the quarantine room with its reason; the false-done shopper is turned back. The ledger receipt prints real ledger events; click a store or shopper for details. Params: `?scenario=crew|cheater|scale&autoplay=1&speed=2&loop=1`.

**Live mode** (`/board?live=1`, also the default with no `scenario`): polls the read-only, public-safe `GET /tasks/:id/board-state` every 4 s (whitelisted fields only: agent ids, claim paths, contender status, gate booleans, verdict winner, ledger kinds/hashes; no tokens or token ids) and redraws the mall as forks, claims, gate results and ledger events change. There is no public task index, so it watches the recorded task ids plus any you add with `&task=<id>,<id>`.

**Open your own repo in the mall** ([/board/new](https://madgrix.ygathuku96.workers.dev/board/new)): paste a public GitHub URL, an instruction and (optionally) the paths to claim. With the demo access key, the Worker imports the repo into Artifacts (binding `import()`), freezes a real task with your instruction (`handleCreateTask`), registers one claim per agent from your instruction and forks one Artifacts repo per agent (`handleClaim` + `handleCreateContender`, the same first steps as `scripts/run-contenders.mjs`), then redirects to the live mall. It does **not** run agents; commits and gate runs come from the agent runners, and the mall shows only what the authority records. Agent secrets and fork tokens are discarded server-side. Protected by a demo key (Worker secret), a per-IP limit (1 import / 10 min, best effort) and a 20 MB repo cap. Verified end to end: `sindresorhus/is-plain-obj` (MIT) → `task_f0936a321f6c5844dd2bc2af`, 2 claims, 2 forks, 8 ledger entries.



Three recorded live runs: crew of 13 on ky (12 overlaps, promoted `d5bcf018194b`) · cheater (`cheater-cal` quarantined, ledger #19 `eval_file_modification`; `false-done-fay` failed hidden tests; `honest-ana` `f27946233a53` promoted and VERIFIED; tampered bundle NOT VERIFIED) · 3,000-agent claims (149/149 overlaps flagged). Agents, files, gates, ledger entries and SHAs are REAL (`scripts/build-board-data.py`); the floor plan, walking and the 300-figure crowd are a visualization.

| Crew of 13 on ky: shoppers at their shelves, overlaps flagged | Crew promoted: everyone in the parking lot, `d5bcf018194b` |
|---|---|
| ![board crew](docs/assets/board-crew.png) | ![board crew promoted](docs/assets/board-crew-done.png) |
| **Cheater: cheater-cal in quarantine, test/ boarded up** | **Price-tag card: real agent details** |
| ![board cheater](docs/assets/board-cheater.png) | ![board price-tag card](docs/assets/board-file-modal.png) |
| **Scale: 3,000 claims, 149/149 overlaps** | **Live mode: a real task imported via /board/new** |
| ![board scale](docs/assets/board-scale.png) | ![board live mode](docs/assets/board-live.png) |
| **/board/new: bring your repo** | |
| ![board new](docs/assets/board-new.png) | |

![Live cheater run: cheater-cal quarantined (eval_file_modification), TheUstad FINAL FALSIFIED, tampered bundle NOT VERIFIED](docs/assets/live-cheater-quarantine.gif)

<sub>Recorded live against the deployed Worker, task `task_6dce45beed286be0230b754e`: the cheating contender is quarantined from the public ledger, a false "done" is FALSIFIED by TheUstad, and a one-byte-tampered bundle fails offline verify.</sub>

---

## Why Git4agents: strongest features

Judging criteria tags: **[O]** originality · **[C]** concurrency, coordination & conflict · **[E]** ease of use.

- **Blind commit-then-reveal evaluation**: verifiers commit to references before candidates exist, then reveal and sign. **[O]**
- **Mandatory, non-overridable gates**: a failed gate loses even with perfect scores; the board's Override button answers *"Refused: mandatory gates cannot be waived"*. **[O][C]**
- **Mechanical cheater quarantine**: editing eval files taints the bundle and revokes write access; live cheater run, ledger #19 `contender_quarantined` (`eval_file_modification`). **[C]**
- **Exact-SHA, single-use signed permits**: only the reviewed commit can reach canonical history; a moved HEAD expires the permit. **[O][C]**
- **Offline verify with a pinned key**: every promotion ships a signed bundle; a one-byte-tampered copy is **NOT VERIFIED**. **[O][E]**
- **Fork crew with path claims and overlap flagging**: 13 agents (1 parent + 12 sub-agents) on ky, 12 overlaps flagged, promoted `d5bcf018194b`. **[C]**
- **3,000-agent claim scale run**: 3,000/3,000 claims granted, 149/149 seeded overlaps flagged, 0 false flags, intact ledger chain. **[C]**
- **Module memory cards**: one card per module, held by per-module Durable Object agents that sleep between requests and wake on routed changes; a second pass re-read 25 of 184 files. **[O][C]**
- **Same-file combine**: per-file three-way merge turns disjoint edits, even in one file, into one COMPOSED commit; overlapping lines become CONFLICTED, never dropped. **[C]**
- **TheUstad done-check**: a "done" commit that is not on the frozen baseline is `FINAL FALSIFIED` and nothing is written. **[C]**
- **Bring any public repo into the live mall**: [/board/new](https://madgrix.ygathuku96.workers.dev/board/new) imports it, freezes a task, claims and forks per agent, and opens `/board?live=1`. **[E]**
- **All on Cloudflare**: Workers, Durable Objects, Queues, Containers, Workflows and Artifacts. **[E]**

## Architecture

```mermaid
flowchart LR
    subgraph Agents
      P[parent agent]
      S1[sub-agent A]
      S2[sub-agent B]
    end
    subgraph CF[Cloudflare]
      W[Worker madgrix<br/>REST · /mcp · /board · /graph]
      DO{TaskAuthority<br/>Durable Object<br/>claims · ledger · permits}
      Q[[Queue madgrix-events]]
      ART[(Artifacts<br/>canonical repo + task forks)]
      WF[Workflow madgrix-promotion]
      CT[Container promote.sh / rebase.sh]
    end
    EV[Evaluation domain<br/>evaluate-candidate.ts]
    P -- claims / contender --> W --> DO
    S1 -- claim + commit --> ART
    S2 -- claim + commit --> ART
    ART -- push event --> Q --> W
    W -- ingest event --> DO
    EV -- fetch exact SHA --> ART
    EV -- evidence bundle --> W
    W -- permit --> WF --> CT -- write permitted SHA --> ART
    DO -- signed bundle --> V[offline verify<br/>pinned key]
```

| Product | Used for |
|---|---|
| **Workers** | `madgrix` Worker: REST API, `/mcp` endpoint, landing page, `/board` (repo mall, live mode, `/board/new`), read-only work graph |
| **Durable Objects** (SQLite) | `TaskAuthority`, one per task: claims, ledger and permits in storage transactions. `ModuleAgent`: per-module memory. `PromotionContainer`: container host |
| **Queues** | `madgrix-events`: Artifacts push events, at-least-once, deduplicated per event key in the DO |
| **Workflows** | `madgrix-promotion`: one instance per permit (the permit id is the instance id), which drives the container promotion |
| **Containers** | `madgrix-promotion` image: trusted `promote.sh` / `rebase.sh`, which write only the permitted SHA |
| **Artifacts** | Git repositories: the canonical `starter-repo` and per-task contender forks with scoped tokens |

More detail is in [docs/CLOUDFLARE_ARCHITECTURE.md](docs/CLOUDFLARE_ARCHITECTURE.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). CanonCap, the causal proof graph, conflict capsules and the canonicality routes are described in [docs/CANONICALITY.md](docs/CANONICALITY.md).

### Fork crew → promote

```mermaid
sequenceDiagram
    participant C as Control plane
    participant P as Parent agent
    participant S as Sub-agents (N)
    participant A as Artifacts fork
    participant T as TaskAuthority DO
    participant E as Evaluation domain
    participant V as Blind verifiers
    participant WF as Workflow + Container
    C->>T: POST /tasks (freeze intent + baseline, enroll agents)
    V->>T: commit references (before any candidate exists)
    P->>T: claim scope · POST /contenders (one fork)
    S->>T: claim distinct paths
    S->>A: commit in own worktree
    P->>P: compose (3-way per file) → TheUstad FINAL VERIFIED?
    P->>A: push combined SHA
    A-->>T: push event via Queue
    E->>A: fetch exact SHA, run gates
    E->>T: evidence bundle (tamper ⇒ quarantine)
    V->>T: reveal + signed reports
    C->>T: verdict seam → single-use permit
    T->>WF: promote exact SHA if HEAD unchanged
    WF->>A: fast-forward canonical
    T-->>C: authority-signed bundle → offline verify
```

### Contender lifecycle

```mermaid
stateDiagram-v2
    [*] --> claimed: WorkClaim registered
    claimed --> forked: contender registered (fork + scoped token)
    forked --> candidate: push observed via Queue
    candidate --> quarantined: evaluator reports eval file changes (eval_file_modification)
    candidate --> rejected: a mandatory gate fails (e.g. hidden oracle)
    candidate --> permitted: verdict ACCEPT → single-use permit
    permitted --> promoted: Workflow writes the exact SHA
    permitted --> candidate: HEAD moved → EXPIRED_HEAD_MOVED, rebase to new SHA
    quarantined --> [*]: token revoked, evidence tainted
    promoted --> [*]: signed bundle
```

<sub>`claimed`, `candidate`, `rejected`, `permitted` and `promoted` are descriptive names for points in the ledger; the stored contender status values are `forked`, `submitted`, `quarantined`, `revoked`, `released`.</sub>

## How Git4agents answers the four questions

### …need to know what other agents are doing?
Before writing, each agent registers a **WorkClaim** (paths, symbols, intent) with the task's `TaskAuthority` Durable Object. Claims are ledgered, and overlapping claims are classified as a conflict risk. Agents read the shared picture through `GET /tasks/:id/context`, the read-only work graph at `/tasks/:id/graph`, or MCP tools (`inspect_work_graph`, `check_clearance`, `claim_work`). In the live run, `sub-api` held `src/api/**` and `sub-ui` held `src/ui/**` on one fork.

### …make conflicting changes?
The parent combines lane commits with a per-file three-way merge. Disjoint edits become one **COMPOSED** commit. Overlapping lines become **CONFLICTED**: no commit is written and neither side is dropped. Only a **RESOLVED** commit can then be evaluated. A conflicted composition admits no evaluation, permit or promotion. If canonical HEAD moves after a permit is issued, the permit expires (`EXPIRED_HEAD_MOVED`). The candidate has to be rebased into a new SHA and re-earn its evidence.

### …need everything they produce reviewed?
Machines review, and nobody can talk them out of it:
- An **independent evaluation domain** runs hidden tests, regressions and policy checks on the immutable candidate. Mandatory gates are non-compensatory: a failed gate loses even with perfect scores and a unanimous verifier vote.
- **Blind verifiers** commit to their references *before* candidates exist, then reveal and sign (commit-then-reveal).
- **Tamperers are quarantined mechanically**: modifying evaluation files taints the bundle and revokes the contender's write token.
- **TheUstad** done-check: the combined commit must sit on the frozen baseline with a clean parent, or it is `FINAL FALSIFIED` and nothing is written.

People handle escalations (ambiguity, trade-offs). Promotion stays blocked while a task is escalated, and no operator path can override an integrity gate.

### …need to know why a change was made?
Each task keeps a hash-chained ledger: intent, claims, composition, evidence, verdict, permit and promotion. The authority signs a DSSE/in-toto bundle for the exact promoted SHA. `npm run verify` checks it offline against a pinned key. `GET /tasks/:id/why/:sha` returns the causal proof graph that answers *why did this exact SHA have the right to become canonical?*

## Real numbers

| What | Result | Source |
|---|---|---|
| Live run `task_6cdb2087a04e389edc87de1c` | 9/9 steps · `concurrent_agents=3` (1 parent + 2 sub-agents) · TheUstad **FINAL VERIFIED** | live Cloudflare, [/board](https://madgrix.ygathuku96.workers.dev/board) |
| Promoted SHA = reviewed SHA | `fc9c1e7084ad14067012a56e68bd8f4c5bdc85c2` | signed bundle, offline `verify` → **VERIFIED** |
| Ledger | 25 hash-chained entries, from `authority_created` to `promotion_succeeded` | same bundle |
| Earlier verified run | `task_0090714a2ca6e6c167ec410a` → promoted `3b71d3a` | [docs/LIVE_RUN_RESULTS.md](docs/LIVE_RUN_RESULTS.md) |
| Big-crew live run `task_99f82dca34d72b85dc1ee92a` | **13 agents committing** (1 parent + 12 sub-agents, one fork) on `ext-ky` (sindresorhus/ky, MIT) → TheUstad **FINAL VERIFIED**, promoted `d5bcf01`, offline `verify` → **VERIFIED** | [docs/SCALE.md](docs/SCALE.md) |
| Live cheater run `task_6dce45beed286be0230b754e` | 3 sibling contenders on `ext-ky`: `cheater-cal` edited `test/base-url.ts` → evaluator `no_eval_tampering=false`, `scope_compliance=false` → ledger #19 `contender_quarantined` (trigger `eval_file_modification`, recovered from the public payload hash); `false-done-fay` said done, hidden oracle **failed**; honest `f27946233a53a3eadc0ea058ae2ee56ac683c558` promoted, offline `verify` **VERIFIED**; one-byte-tampered bundle → `ledger chain FAIL`, **NOT VERIFIED** | `node scripts/live-cheater-demo.mjs run` |
| Adversarial trials | 26/26 blocked, 0 unauthorized promotions | `npm run attack:lab` (local, real modules) |
| Module memory | second pass re-reads **25 of 184 files (13.6%)** after one edit | [docs/MODULE_MEMORY.md](docs/MODULE_MEMORY.md); vscode benchmark in [docs/MODULE_MEMORY_BENCHMARK.md](docs/MODULE_MEMORY_BENCHMARK.md) |
| Test suite | 439 tests, all passing | `npm test` |

## Scale: the coordination layer, live

One task, N scripted agents against the live Worker. Each is enrolled, claims a distinct path with its intent, and every 20th also claims its neighbour's path. Overlaps are **FLAGGED** to the claimant (risk + explanation), not refused. This is the coordination layer: **no Artifacts fork per agent** (commits go through fork crews, one fork per crew). Full method and caps: [docs/SCALE.md](docs/SCALE.md).

| N | Claims granted | Seeded overlaps flagged | False flags | p50 / p95 ms | Ledger chain |
|---|---|---|---|---|---|
| 100 | 100/100 | 4/4 | 0 | 106 / 216 | OK |
| 1,000 | 1,000/1,000 | 49/49 | 0 | 291 / 658 | OK |
| 2,000 | 2,000/2,000 | 99/99 | 0 | 593 / 1,447 | OK |
| 3,000 | 3,000/3,000 | 149/149 | 0 | 827 / 2,407 | OK |
| 5,000 | 4,997/5,000 (3 client socket resets) | 249/249 | 0 | 1,829 / 4,849 | OK |

> One Git4agents task coordinated 3,000 of 3,000 live agents (4,997 of 5,000) with every seeded path overlap flagged, zero false flags, an intact hash-chained ledger, and no fork per agent. Separately, a live crew of 13 agents committed on one fork and its combined SHA was verified and promoted.

The limit is latency on the task's single Durable Object (claims are serialized), not correctness.

## Quick start (local, no Cloudflare account)

Requires Node 22+ and git.

```bash
git clone https://github.com/YashwanthGathuku/Git4agents && cd Git4agents
npm ci
npm test              # 439 tests
npm run typecheck
npm run slice         # full protocol locally: claims → quarantine → blind verdict → permit → promote → signed bundle
npm run headmove      # HEAD moves under a permit: stale SHA refused, rebased SHA promoted
npm run demo:memory   # module memory: second pass re-reads only affected modules
npm run attack:lab    # 26 adversarial trials against the real modules

# offline verify of real live-run bundles against the pinned authority key
npm run verify -- --trust-key keys/authority.pub docs/bundles/live-run-4.bundle
npm run verify -- --trust-key keys/authority.pub docs/bundles/live-crew-13.bundle
npm run verify -- --trust-key keys/authority.pub docs/bundles/live-cheater.bundle
```

Each `verify` prints the check transcript and ends with `VERIFIED`. Change any byte of a bundle and it ends with `NOT VERIFIED`.

## Live flows (your own Cloudflare account)

These need a deployed Worker, an Artifacts namespace with a baseline repo, the `madgrix-events` queue with a push subscription, and the three service tokens. See [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) and [docs/CLOUDFLARE_LIVE_READINESS.md](docs/CLOUDFLARE_LIVE_READINESS.md). Load secrets from a file; never echo them.

Required by `scripts/live-e2e.ts`: `MADGRIX_BASE_URL`, `MADGRIX_CONTROL_SERVICE_TOKEN`, `MADGRIX_AGENT_SERVICE_TOKEN`, `MADGRIX_EVALUATION_SERVICE_TOKEN`, `MADGRIX_BASELINE_REPO`, `MADGRIX_BASELINE_COMMIT`, `MADGRIX_INTENT`, `MADGRIX_BEHAVIOR_CONTRACT`, `MADGRIX_HIDDEN_TEST_COMMAND`, `MADGRIX_CLAIM_PATHS` (or `MADGRIX_CLAIM_TEMPLATE`), plus `MADGRIX_AGENT_COMMAND` in sibling-contender mode. Useful optional ones: `MADGRIX_QUEUE_ID`, `MADGRIX_ARTIFACTS_NAMESPACE` (default `default`), `MADGRIX_FORK_CREW_CONFIG`, `MADGRIX_FLEET_CONFIG`, `MADGRIX_TRUST_KEY`, `MADGRIX_BUNDLE_PATH`, `MADGRIX_EVENT_TIMEOUT_MS`.

```bash
set -a; . ./secrets.env; set +a          # MADGRIX_*_SERVICE_TOKEN values, kept out of the shell history

# 1. Fork crew (MADGRIX_AGENT_IDS unset): one parent fork, 12 path-scoped sub-agents, TheUstad, promote, verify
MADGRIX_BASE_URL=https://<your-worker>.workers.dev \
MADGRIX_BASELINE_REPO=ext-ky MADGRIX_BASELINE_COMMIT=<sha> \
MADGRIX_FORK_CREW_CONFIG=configs/git4agents-fork-crew-big.json \
MADGRIX_FLEET_CONFIG=configs/git4agents-fork-crew-big.yaml \
MADGRIX_CLAIM_PATHS='<the 12 crew paths>,.madgrix/**' \
MADGRIX_INTENT='…' MADGRIX_BEHAVIOR_CONTRACT='…' MADGRIX_HIDDEN_TEST_COMMAND='…' \
MADGRIX_TRUST_KEY=keys/authority.pub \
npm run live:e2e

# 2. Cheater demo (sibling contenders honest / cheater / false-done; sets its own AGENT_IDS, AGENT_COMMAND, CLAIM_PATHS, HIDDEN_TEST_COMMAND)
MADGRIX_BASE_URL=… MADGRIX_BASELINE_REPO=ext-ky MADGRIX_BASELINE_COMMIT=<sha> \
MADGRIX_INTENT='…' MADGRIX_BEHAVIOR_CONTRACT='…' MADGRIX_TRUST_KEY=keys/authority.pub \
MADGRIX_BUNDLE_PATH=/tmp/cheater.bundle \
node scripts/live-cheater-demo.mjs run

# 3. Scale: N scripted agents claim paths on one task (no forks)
MADGRIX_BASE_URL=… MADGRIX_BASELINE_REPO=<repo> MADGRIX_BASELINE_COMMIT=<sha> \
node scripts/scale-agents.mjs --mode live --ramp 10,100,500,1000 --concurrency 25
node scripts/scale-agents.mjs --mode local --ramp 10,100,1000   # no account needed
```

`ext-ky` is `sindresorhus/ky` (MIT) imported into Artifacts with `cf artifacts namespaces repos import ext-ky --namespace default --url https://github.com/sindresorhus/ky.git --branch main`.

## Honest limits

- Live runs are evidence, not a reliability statistic. All live agents are **scripted** (shell commands or `scripts/live-cheater-demo.mjs`), not LLMs.
- The old `/replay` page is retired (301 → `/board`). Simulated attacks live in the local test harness (`npm run attack:lab`); the live cheater run on `/board` is the live counterpart.
- TheUstad only checks the frozen baseline and a clean parent; it is not a semantic judge. In the cheater video, the FALSIFIED check runs TheUstad locally on a clone with a wrong baseline, not inside the Worker.
- Overlapping claims are **flagged**, not refused. Scale numbers are for the claim/coordination layer on one task; commits go through fork crews, not one fork per agent. Claim latency grows with N because one Durable Object serializes a task.
- In live runs the first push was sometimes not observed and the harness pushed again (logged). A deliberate Queue redelivery test is not claimed.
- Evaluation-domain auth is a bearer secret, not mTLS. Signing is Ed25519 with a pinned key, no KMS/HSM.
- Fork-crew worktrees use scoped credentials but are not adversarial microVM isolation.
- More: [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

## Documentation

- [docs/CLOUDFLARE_ARCHITECTURE.md](docs/CLOUDFLARE_ARCHITECTURE.md): how each Cloudflare product is used
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): protocol architecture and trust domains
- [docs/CANONICALITY.md](docs/CANONICALITY.md): CanonCap, the causal proof graph, conflict capsules, `/why`
- [docs/CANONICALITY_PRIMITIVES.md](docs/CANONICALITY_PRIMITIVES.md): canonicality primitives in detail
- [docs/CANONICALITY_PRIOR_ART.md](docs/CANONICALITY_PRIOR_ART.md): prior-art boundary for the canonicality primitives
- [docs/SCALE.md](docs/SCALE.md): the 3,000-agent live scale run and crew runs
- [docs/FLEET_10K.md](docs/FLEET_10K.md): 10,000-agent fleet scaling notes
- [docs/LIVE_RUN_RESULTS.md](docs/LIVE_RUN_RESULTS.md): live run results, with vs without Git4agents
- [docs/MODULE_MEMORY.md](docs/MODULE_MEMORY.md): module memory cards and per-module agents
- [docs/MODULE_MEMORY_BENCHMARK.md](docs/MODULE_MEMORY_BENCHMARK.md): module memory benchmark
- [docs/BENCHMARK_RUNBOOK.md](docs/BENCHMARK_RUNBOOK.md): pre-registered benchmark procedure
- [docs/MCP_AGENT_TOOLS.md](docs/MCP_AGENT_TOOLS.md): the MCP agent interface (`/mcp`)
- [docs/VERIFY_ARTIFACT.md](docs/VERIFY_ARTIFACT.md): offline bundle / artifact verifier
- [docs/SECURITY.md](docs/SECURITY.md): security model
- [docs/SECURITY_BOUNDARIES.md](docs/SECURITY_BOUNDARIES.md): security boundaries between domains
- [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md): known limitations
- [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md): deploying your own Worker
- [docs/CLOUDFLARE_LIVE_READINESS.md](docs/CLOUDFLARE_LIVE_READINESS.md): live readiness checklist
- [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md): demo runbook
- [docs/FINAL_COMPETITION_DEMO.md](docs/FINAL_COMPETITION_DEMO.md): competition demo runbook
- [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md): demo video script
- [keys/README.md](keys/README.md): the pinned authority public key (`keys/authority.pub`)
- [docs/bundles/](docs/bundles): signed bundles from the live runs (`live-run-4`, `live-crew-13`, `live-cheater`) for offline verify
- [specs/](specs): the frozen protocol specs and amendments

## License

[MIT](LICENSE) © 2026 Yashwanth Gathuku
