# Spec amendment: resolution-lease-v1 — a resolver writes only the conflicted paths

**Status:** proposed · **Date:** 2026-10-18
**Affects:** `specs/amendments/composition-result-v1.md` §(2) RESOLVED, and
`specs/amendments/conflict-capsule-v1.md`, by this amendment file only.
The frozen spec files are not edited.

## (1) The defect

composition-result-v1 let a resolver "read the baseline tree,
`.madgrix/conflict.json`, and `.madgrix/sides/<agent>/`". `resolveComposition`
implemented that by resetting the parent checkout to the baseline, writing the
conflict inputs into the working tree, running the resolver, and checking only
the conflicted files. Three things followed, each reproduced on commit
`ee421f0` with the demo crew:

1. **Clean work could be dropped.** The resolver had to rebuild every
   non-conflicting file itself. A resolver that wrote only `src/contract.js`
   produced a RESOLVED commit holding none of `src/api/handler.js`,
   `src/ui/view.js` or `test/integration/check.js`. `commitIndex` still wrote
   every sub-agent commit as a parent, so Git history claimed the crew's work
   was merged while the tree did not contain it.
2. **Writes were unbounded.** After the resolver exited, everything was staged
   with `git add -A`. A resolver could rewrite another agent's test, edit an
   unrelated file, or add a new one.
3. **Inputs were committed.** `.madgrix/conflict.json` and
   `.madgrix/sides/<agent>/…` were staged into the candidate tree, so both
   sides' full text would ship to canonical history on promotion.

## (2) The lease

A resolver receives a **resolution lease**: the set of conflicted paths and
nothing else.

1. The lease is derived from the crew's commits (`classifyEdits`), not taken
   from the conflict record. A record whose paths differ from the derived
   conflicts is refused before the resolver runs.
2. The authority writes the **pre-composed tree** itself: the baseline plus
   every crew edit outside the lease, using the same rule as COMPOSED (one
   owner → that agent's blob; several owners → their disjoint three-way merge).
   Leased paths keep their baseline text.
3. Resolver inputs are written to a fresh directory outside the repository.
   The resolver receives `MADGRIX_CONFLICT_PATH` (absolute path to the
   conflict JSON), `MADGRIX_SIDES_DIR` (absolute path to the side texts),
   `MADGRIX_BASELINE_SHA` and `MADGRIX_LEASED_PATHS` (newline-separated). It
   still receives no service token. The directory is deleted when the resolver
   exits.
4. After the resolver exits, the staged tree is compared with the pre-composed
   tree. Any changed path outside the lease — a modification, an addition or a
   deletion — refuses the resolution. Each leased path must exist, must have
   changed, and must contain no `<<<<<<<` or `>>>>>>>` text.
5. On refusal the parent checkout returns to the baseline and no commit is
   written.
6. The RESOLVED record (`.madgrix/subagent-intents.json`) carries
   `lease: { format: "madgrix-resolution-lease/v1", paths, precomposed_tree }`,
   so anyone can check that the resolved tree differs from the pre-composed
   tree only on leased paths and the authority's own records.

## (3) What does not change

- RESOLVED is still a new SHA that is not a contributing SHA, and still needs
  its own evaluation, verdict and permit.
- The authority's composition state machine (`recordComposition`) is unchanged.
- COMPOSED output is byte-for-byte unchanged; the clean-edit rule was moved
  into a shared helper, not altered.

## (4) What this amendment does not say

- **Intent is not checked here.** The lease bounds *where* a resolver writes.
  A resolver that keeps only one side's text inside a leased path is still
  accepted at this layer. Whether a resolution preserves each side's intent is
  an evaluation question (a per-side witness gate is planned; it is not part of
  this amendment).
- **The lease is file-level.** Hunk-level leases (only the conflicting line
  ranges are writable) are planned with Conflict Capsule v2.
- **The resolver is not sandboxed.** It runs as a local process with a minimal
  environment, as fork-crew sub-agents do (`docs/KNOWN_LIMITATIONS.md` #11).
  The lease is enforced on what is committed, not on what the process can touch.
- The capsule id and the resolver's identity are not yet bound into the
  authority ledger.

Tests: `test/resolve-lease.test.ts`.
