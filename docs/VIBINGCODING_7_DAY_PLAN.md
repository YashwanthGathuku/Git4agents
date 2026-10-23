# Vibingcoding: seven days to a verifiable software delivery demo

Prepared October 23, 2026. Working product spelling: **Vibingcoding**; retain
Git4agents/MADGRIX module names internally this week. This is a build plan, not a
claim that the proposed lifecycle is already implemented.

## Product decision

**Give Vibingcoding a software problem. Watch it coordinate workers, reject a bad
fix, verify a good one, and deliver an identifiable release.**

The long-term product owns the journey from intent to a healthy running service.
Coding tools are workers within that journey. The differentiator to demonstrate
this week is accountable delivery: a worker claiming success cannot authorize
its own promotion or substitute another artifact at release time.

First users: small teams already using coding agents but still spending time
reviewing their work, resolving collisions, checking tests, and repairing failed
releases. Interview three such developers by Day 2. Ask them to show a recent
failure; measure the manual steps before making productivity claims.

Do not promise that this system universally outperforms coding products. Prove
one outcome on a reproducible task, then expand the evidence.

## What the audit found

Working branch: `codex/vibingcoding-nebius-7day`, based on
`madforce/integration` at `a769300`. That branch contains the recent resolution
hardening plus persistent signing keys. Avoid restarting from the older `main`.

| Component | Evidence inspected | Decision |
| --- | --- | --- |
| Git4agents | Promotion authority, leases, witnesses, ledger, signed bundles, resolution ladder | Keep as the control plane. Extend, do not rebuild. |
| Repo Mall | Existing board UI, recorded evidence mode, live import/task/fork path | Keep visual identity; add a real run launch and lifecycle events. Import alone does not launch workers. |
| Resolution demo | Real local Git operations; final evaluation/signing section explicitly uses harness evidence | Replace that evaluation seam before describing this as a live verified delivery demo. |
| Nebius runtime | No existing Nebius integration in audited base | Initial adapter added in this branch; live account verification remains. |
| Release admission | No source-to-built-artifact check in inspected path | Initial library, CLI, and adversarial tests added in this branch. Deployment remains separate work. |
| AgentFleet | README inspected; integration not validated | Reuse a small scheduler adapter only if its contract works in half a day. Otherwise use existing runner. |
| THEUSTAD | Existing done-check integration and project documentation | Reuse independent checks; do not count an LLM review as a substitute for executable checks. |
| METIS | Prior design describes pipeline inspection/repair; source integration not validated here | Optional incident helper, never a critical-path dependency this week. |
| Memory projects | Existing ideas and Git4agents module memory | Defer importing another database or memory platform. |

Baseline on this host before the new work: 528 tests, 493 passed, 32 failed,
3 skipped. Resolver tests encounter unavailable Linux sandbox namespaces despite
`bwrap` being installed. Resolve on a suitable runner and inspect all failures;
do not disable isolation or call the whole suite green.

Initial implementation verification: 34 focused tests passed, including 21 new
tests for release admission and the Nebius adapter; TypeScript checking passed.
Provider tests use mock HTTP. Release tests use synthetic signed fixtures. Neither
is evidence of a live model run, independent production evaluation, or deployment.

## The first 30 seconds

Open on the mall with one small checkout service selected. No login, slide deck,
provider setup, or empty prompt box in the opening video. The judge demo should
also offer a fresh run without requiring a paid provider account.

| Time | Visible moment | What it proves |
| --- | --- | --- |
| 0–5 s | A checkout request fails. One action: “Repair checkout safely.” The affected shop turns red. | A recognizable software problem and an immediately useful action. |
| 5–12 s | Work appears in two isolated workshops. A shortcut patch tries to weaken a protected test and is rejected, with the exact reason. | Workers do not define success or grant themselves authority. |
| 12–20 s | A real Nemotron repair passes frozen checks. Select the receipt to reveal the commit, test evidence, and model used. | The result is inspectable; NVIDIA/Nebius performs essential work. |
| 20–26 s | A substituted artifact is refused. The artifact bound to the verified source is accepted by the release check. | Verification follows the actual release artifact. |
| 26–30 s | The checkout preview succeeds; its release digest matches the receipt. | The workflow ends in a working, identifiable result. |

These are **storyboard durations, not measured execution latencies**. Record a
real completed run. If inference/build waits are shortened in the video, mark
the time compression and show measured elapsed time. Never animate a fabricated
completion. In the app, label LIVE, RECORDED RUN, and UNIT FIXTURE distinctly.
Keep an inspectable recorded run as fallback if a fresh run is slow or unavailable.

Opening narration: “An agent says it fixed checkout. Vibingcoding checks the
work, blocks a shortcut, and releases only the artifact tied to verified code.”

The longer video can show a conflicting edit, dual-order resolution, and recovery
after a failed health check. Do not crowd all three stories into the opening.

## One vertical slice

Use a small repository we own with a reproducible checkout regression, ordinary
unit tests, and a simple HTTP preview. Freeze the acceptance checks before work
begins. Include both positive cases and a regression case; prevent a patch that
always returns success from passing. The demo is an evaluation fixture, not a
claim about general bug-fixing performance.

1. The owner submits a task; authority freezes baseline, policy, checks, budget,
   and protected paths. One active run per judge session.
2. A runner creates isolated workspaces and scoped identities. Two workers at
   most; path claims and overlap handling reuse Git4agents.
3. Nebius Token Factory runs an available NVIDIA Nemotron model on a genuine
   repair or conflict-resolution task. Record model ID, request ID when exposed,
   timestamps, token usage when exposed, and redacted outcome evidence.
4. The evaluator runs immutable checks outside the worker's writable workspace.
   A failed check, unavailable sandbox, or ambiguous result yields REFUSED or
   REVIEW. The worker never holds evaluator or signing credentials.
5. Existing promotion logic admits the exact revision. A trusted builder builds
   from that revision, measures the artifact, and signs source/artifact provenance.
6. Release admission verifies pinned authority and builder keys, passing evidence,
   current promoted revision, repository, environment, and actual artifact bytes.
7. The deployer enforces expiry, idempotency, and compare-and-swap on release state,
   then deploys the same immutable bytes. The new admission function alone is not
   a deployment permit and does not implement this controller.
8. A health probe records observed behavior. On failure, restore a known healthy
   release; allow at most one bounded repair cycle. A repair follows the same gates.

Keep authority/evaluator/build credentials separate from worker model credentials.
The trusted builder's signature authenticates its provenance claim; correctness
still depends on isolation and the builder actually using the specified source.
The dashboard cannot override a refusal. Public demo execution must target only
the owned demo repository, with concurrency, spend, and lifetime limits.

## The mall must explain state

| Mall element | Actual meaning |
| --- | --- |
| Shop | A repository/service with one visible current release |
| Workshop | Worker identity, leased scope, current task, elapsed time |
| Inspection desk | Independent test results and refusal reasons |
| Loading dock | Source commit → build artifact → release receipt |
| Service desk | Health check, incident, rollback, bounded repair |
| Receipt drawer | Downloadable evidence and offline verification command |

Show the selected shop prominently; keep secondary buildings quiet. Every state
transition comes from the controller's events. Include run ID, sequence number,
timestamp, and evidence link. Reconnecting must restore the same run, not restart
work. Unknown/stale health is not green. Motion illustrates recorded events and
never manufactures them. Provide a text/list view and keyboard-accessible controls.

## Seven-day execution schedule

Build October 23–29; preserve October 30 for submission and access checks.
Official deadline: **October 30, 2026, 17:00 UTC / 1:00 p.m. EDT**.
Target submission at least four hours earlier.

| Day | Work | Exit checkpoint |
| --- | --- | --- |
| 1 · Oct 23 | Lock scope and base; add Nebius adapter and release admission; provision a sandbox-capable runner; select the owned demo task. | New tests/typecheck pass; categorize baseline failures; one real Nebius/NVIDIA response saved with redacted metadata. Initial code is done; live credentials/runner remain. |
| 2 · Oct 24 | Connect runner → model → scoped patch → independent evaluation. Replace harness promotion evidence in this path. Speak to three target users. | A real repair passes frozen tests; a worker editing checks is rejected. Same task can be rerun from clean state. |
| 3 · Oct 25 | Trusted build, signed provenance, admission, and preview deployer. | Good artifact deploys; substituted bytes, stale commit, wrong environment, and untrusted keys cannot release. Downloadable receipt matches preview. |
| 4 · Oct 26 | Connect the existing mall to run launch and authoritative lifecycle events. | A new visitor can start the owned demo and inspect its result without a terminal. Refresh/reconnect works. |
| 5 · Oct 27 | Health probe, rollback, and one bounded repair loop. Failure-path rehearsal. | Injected failure is detected; safe rollback works; repair cannot bypass gates. If this slips, keep detection/rollback and cut automatic re-repair. |
| 6 · Oct 28 | Measure behavior, get fresh user feedback, polish readability and first-30-second story. | Publish raw results and limitations; a new tester can explain what happened and why the bad release was blocked. |
| 7 · Oct 29 | Freeze features; record <3-minute video; finalize README, new-work disclosure, model/provider feedback and submission draft. | Three consecutive rehearsals; fresh-browser judge access; reproducible setup; all required links work. |

## Hard scope limits

- One owned demo repository, one deployment target, one real Nebius/NVIDIA path.
- Two workers maximum, one bounded recovery attempt, a strict run budget.
- No new IDE, model training, general browser agent, billing system, arbitrary
  public code execution, multi-cloud deployment, or migration of every old project.
- No generic plugin marketplace or full multi-tenant credential vault this week.
- Use existing Git4agents concurrency/resolution rather than another orchestration
  framework. Optional Mergiraf uses the existing adapter only if readily available.
- Freeze new dependencies after Day 2. Each dependency must remove a concrete task,
  have a compatible license, and remain outside the authority trust boundary unless
  deliberately reviewed. Record versions and attribution.

## Own-login coding tools and the longer-term product

Preserve the user's goal: existing tools can work in their own isolated sessions,
with user-owned accounts and files. The most practical first connector is a local
runner where the user authenticates directly in the official tool. Vibingcoding
coordinates repository changes, task state, tests, and release evidence. It need
not scrape private chat transcripts to be useful.

Do not equate “uses their own login” with unrestricted hosted embedding rights.
Provider auth and commercial integration rules differ and must be checked for the
chosen deployment model. Do not collect third-party passwords or broker consumer
subscription tokens. Use supported interfaces and API billing where appropriate;
keep unsupported integrations out of the submission promise.

After submission: add durable local/remote sessions, supported provider adapters,
project memory from verified outcomes, richer task scheduling, multi-repository
coordination, and production incident workflows. Retain a clear separation among
worker, verifier, builder, and release authority as the product grows.

## Evidence that earns the claim

Run ten clean repetitions of the same fixture and report numerator/denominator,
not only the best take. Capture task start → verified healthy preview time, model
calls, tokens/cost when measurable, human interventions, completion count, and
rejection/rollback outcomes. Report median and range; this small sample does not
support universal reliability claims.

Evaluate independently: ordinary fix; failed protected test; evaluator unavailable;
wrong artifact; stale promoted head; wrong environment; duplicate delivery event;
process restart; provider timeout; failed post-release health probe. Publish the
failure log and the exact commit used. Compare against a documented manual workflow
on the same task. Measure process overhead separately from inference latency.

Keep each claim tied to its evidence class: source inspection, unit test, recorded
integration run, or observed deployed behavior. Synthetic signing fixtures and a
recorded board do not establish a live autonomous loop.

## Submission and runway

Target the Coding and agentic engineering track. Use Nebius Token Factory at
runtime with an NVIDIA open-source model available to the account; the model must
perform real work, rather than provide decorative descriptions. Existing project
work is reused, so list the substantial changes built for this event with commits.

Prepare a public repository with its existing Apache-2.0 license and third-party
notices, reproducible setup, working demo, an English public YouTube video shorter
than three minutes, and concrete Nebius/NVIDIA feedback. Keep free judge access
working through December 15, 2026, 20:00 UTC. Reserve infrastructure budget and
limit demo concurrency; submission day is not the end of hosting responsibility.

Sources checked October 23, 2026:

- [Official event and judging criteria](https://nebiusglobalaihackathon.devpost.com/)
- [Rules and deliverables](https://nebiusglobalaihackathon.devpost.com/rules)
- [Official dates](https://nebiusglobalaihackathon.devpost.com/details/dates)
- [Organizer guidance: Will Your Project Ship?](https://nebiusglobalaihackathon.devpost.com/updates/47163-recording-will-your-project-ship)
- [Nebius Token Factory API](https://api.tokenfactory.nebius.com/docs)
- [Official NVIDIA Nemotron examples](https://github.com/nebius/token-factory-cookbook/tree/main/models/nemotron)

## Immediate next work

Configure a Nebius key in the runner's secret environment, select a currently
available NVIDIA model, and run a minimal authenticated request. Never put the key
in a commit or chat. Then use a host supporting the existing sandbox, establish a
passing baseline there, and wire real independent evaluation to the demo task.
This is the next checkpoint; UI polish should not hide an unconnected evaluator.
