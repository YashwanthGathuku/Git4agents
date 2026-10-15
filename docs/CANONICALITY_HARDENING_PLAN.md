# MADGRIX Canonicality Hardening — Competition Sprint

Base: exact recovered source `4a37c8fae3ca9fa19918c203fb3c70043210281a`.

This branch is intentionally isolated from the successful competition deployment and from `competition/final`. Do not redeploy, replay the successful permit, reset canonical state, or move the frozen release branch merely to develop these presentation/protocol improvements.

## Product thesis

**Git decides ancestry. MADGRIX decides canonicality.**

**Canonicality is a capability, not a branch permission.**

MADGRIX's differentiated job is not to be another agent chat UI or merge queue. It establishes why one exact candidate is allowed to cross from concurrent agent work into canonical repository state, and preserves evidence sufficient to verify that decision later.

## Sprint order

### P0-A — CanonCap

Status: SPECIFIED.

`specs/amendments/canoncap-v1.md` names and formalizes the existing exact-state permit + reservation mechanism. Do not rewrite the proven promotion path simply to rename it. Presentation/API aliases can be layered over the existing `PermitRecord` semantics.

Acceptance:

- no existing permit/bundle format broken;
- exact candidate/tree/evidence/policy/destination bindings remain visible;
- replay and quarantine semantics remain fail-closed;
- judge-facing wording is accurate.

### P0-B — Conflict Capsule

Status: SPECIFIED; implementation next.

First implementation should be a pure projection from an existing `CONFLICTED` `CompositionRecord`, plus deterministic hashing and tests. It must not create a candidate or alter promotion eligibility.

Acceptance:

- conflicted composition produces a machine-readable capsule;
- capsule contains baseline, contribution SHAs, paths and sides;
- no candidate SHA is invented;
- resolution explicitly requires fresh evaluation;
- tests prove deterministic projection/hash behavior.

### P0-C — Causal Proof Graph / `why`

Build a read-only proof projection from facts already in `AuthorityState` and signed promotion bundles:

```text
Task -> Claims -> Contributions/Composition -> Candidate
     -> Evaluation -> Blind Reports -> Verdict -> CanonCap
     -> Reservation -> Promotion -> Canonical SHA
```

The graph must never invent missing edges. Each edge should say whether it is cryptographically bound, authority-recorded, or merely descriptive.

Target surfaces:

- JSON projection for tools/agents;
- Mission Control section for judges;
- optional CLI `madgrix why <sha|task>` if it can be added without destabilizing packaging.

### P0-D — Attack Lab

Prefer deterministic local/replay demonstrations over touching the successful live promotion.

Minimum scenarios:

1. candidate/tree substitution -> refused;
2. moved destination head -> refused;
3. consumed permit replay -> refused;
4. quarantined/voided authority -> refused;
5. unresolved conflict -> refused.

The output must distinguish tests/simulations from a live Cloudflare attack. Never claim a scenario was exercised live unless evidence shows it was.

Desired final line:

```text
5 adversarial scenarios
5 refused
0 unauthorized canonical writes
```

Only print that line if all five actually pass.

### P0-E — Mission Control

Extend the existing Work Graph page rather than building a second UI.

Add judge-readable panels for:

- Canonicalization path;
- CanonCap bindings;
- causal proof path;
- Conflict Capsule when composition is conflicted;
- promotion verification state;
- adversarial guarantees, clearly labeled as demonstrated/tested vs protocol invariant.

Do not let UI code decide authority. It remains a projection of stored protocol state.

## P1 — Shrink-only delegated authority

Do not start until P0 is green.

For parent -> child delegation enforce monotonic reduction:

```text
scope(child)  subset-of scope(parent)
tools(child)  subset-of tools(parent)
budget(child) <= reserved(parent)
expiry(child) <= expiry(parent)
depth(child)  = depth(parent) + 1
```

This should become an Authority DAG whose delegations are auditable. It is not required for the competition submission if it threatens P0 stability.

## Release discipline

Every claim must be SHA-qualified.

Historical full-suite/CI results from another SHA are not automatically evidence for this branch. Before any submission branch move:

1. inspect diff from `4a37c8fa`;
2. run typecheck;
3. run complete existing test suite;
4. run new focused tests;
5. inspect CI at the exact resulting SHA;
6. ensure no secrets/evidence-private material entered Git;
7. update run/demo docs truthfully.

The successful Cloudflare promotion remains preserved while this work happens.