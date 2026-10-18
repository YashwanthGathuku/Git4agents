# ICSE 2027 tool-demo video — script (target 4:00, limit 3–5 min)

The track requires a 3–5 minute YouTube video that is accessible during review.
Every command below is real and runs from a checkout of the `governed-resolution`
branch. Record at 1080p, terminal font ≥ 16 pt.

| Time | Screen | Say (short) |
|---|---|---|
| 0:00–0:25 | Title card, then the README's one-line flow | "Coding agents now work on one repository in parallel. Git records ancestry, but it can't say which agent's state should become canonical, or resolve two agents' edits to the same lines safely. Git4agents keeps Git and governs canonicality around it." |
| 0:25–1:05 | Live board, `https://madgrix.ygathuku96.workers.dev/board?scenario=cheater&autoplay=1` | "This is a recorded live run on Cloudflare. Each agent works in its own Artifacts fork under a declared claim. This contender edited a test file: that is evidence tampering, so it is quarantined mechanically. This one said 'done' and failed the hidden tests. The honest contender is promoted — the exact commit that was reviewed." |
| 1:05–1:40 | Terminal: `npm run verify -- --trust-key keys/authority.pub docs/bundles/live-cheater.bundle`, then the same on a copy with one byte changed | "Every promotion ships a signed bundle. Anyone can verify it offline against a pinned key. Change one byte and it is NOT VERIFIED." |
| 1:40–3:05 | Terminal: `npm run demo:resolution` (scroll slowly) | "Now the new part: governed resolution. Two agents rewrite the same line. The authority writes all clean work itself; the resolver may change only the conflicted hunk. Each agent's witness was frozen before any resolver ran. A lazy resolver keeps one side — the witness gate refuses it and names the intent it lost. A resolver that keeps both is admitted, bound to the conflict capsule, promoted, and the eleventh verify line names that capsule." |
| 3:05–3:40 | `bench/resolution/results/results.md`, Table I rows | "On 64 resolution attempts over three real npm packages, the earlier resolve path admitted 37 wrong resolutions. The lease removed two failure classes; with frozen witnesses, none were admitted, and one correct merge was refused — a whitespace change by Mergiraf." |
| 3:40–4:00 | README "Honest limits" + repo URL | "The scenarios are small and author-written, and no LLM resolver has been evaluated yet; that is next. Code, benchmark and specs are Apache-2.0 at github.com/YashwanthGathuku/Git4agents." |

## Before recording

- `npm ci && npm test` (482 passing) so the terminal is warm.
- `cargo install mergiraf --locked` if you want the Mergiraf rung shown; the demo
  and benchmark run without it (the benchmark then skips that behaviour).
- For the one-byte tamper: `cp docs/bundles/live-cheater.bundle /tmp/t.bundle` and
  change one hex digit inside a `"payload_hash"` with an editor.
- The benchmark needs commit `ee421f0` in local history (do not use a `--depth 1` clone).
