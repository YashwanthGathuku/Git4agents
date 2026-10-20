# ICSE 2027 Tool Demonstrations and Data Showcase — submission checklist

Track page: https://conf.researchr.org/track/icse-2027/icse-2027-demonstrations
(re-read 2026-10-19). Submission site: https://icse27demos.hotcrp.com/
**Deadline: Friday 23 October 2026, Anywhere on Earth.**
Notification 11 December 2026; camera-ready 20 January 2027.

## What the call requires, and where the paper stands

| Requirement (from the call) | Status |
|---|---|
| At most 4 pages of main text, inclusive of all references, figures, tables, appendices | `main.pdf` is 4 pages including references |
| IEEE template, `\documentclass[10pt,conference]{IEEEtran}`, no compsoc options | Done |
| Single-anonymous review: author names included | Included |
| Abstract ends with the video URL | Done; the URL is still the placeholder `https://youtu.be/VIDEO-ID` |
| 3–5 minute video on YouTube, accessible during review | Video made (3:54, captioned); **upload it** |
| Envisioned users, SE challenge, user workflow, validation results | Sec. IV (users, workflow), Sec. I (challenge), Sec. V (validation) |
| Tool in an easy-to-use form; "do not expect reviewers to have to build your code" | Container `ghcr.io/yashwanthgathuku/git4agents:icse27` (Sec. IV), plus the live deployment |
| Authors obtain an ORCID | **Check yours is on your HotCRP profile** |
| Carbon footprint, where appropriate | One sentence in Sec. V.2 |
| No AI-use policy in the call | The acknowledgment discloses AI assistance (IEEE policy) |

## Before you submit (your actions)

1. **Container: done.** `ghcr.io/yashwanthgathuku/git4agents:icse27` was published on
   2026-10-19 after 482/482 tests, a VERIFIED demo and 204/204 matching benchmark
   outcomes inside the image; the workflow confirmed an anonymous pull works (public).
2. **Code link.** The paper links to `.../tree/icse27-tool-paper`, and every push to that
   branch republishes `:icse27` after the image passes its checks. Avoid pushing to it
   during review unless you mean reviewers to see the change. A tag (e.g. `icse27-demo`)
   is optional; this session's git proxy refused tag pushes, so create it yourself if
   you want one, and point the paper at `.../tree/<tag>`.
3. **Merge PRs #2 and #3**, or leave `main` as it is: the paper links to the branch, so
   reviewers see the right code either way, but the repository front page shows `main`.
4. **Upload the video** to YouTube (Public or Unlisted, not Private), then replace
   `https://youtu.be/VIDEO-ID` at the end of the abstract and rebuild.
5. **Affiliation.** The author block says "Independent researcher, Cleveland, Ohio, USA".
6. **Live board.** Open https://madgrix.ygathuku96.workers.dev/board once to confirm the
   deployment is still up; the paper and the video both point to it.
7. Build: `pdflatex main && bibtex main && pdflatex main && pdflatex main`, then upload
   `main.pdf` to HotCRP.

## References checked (2026-10-19)

Every reference was re-checked against its source page: Xu et al. (arXiv:2607.04697:
747 pairs, 41.7% vs 19.8%), Merge-Bench (ICPR 2026: "less than 60%"), SWE-Git-Bench
(NeurIPS 2026 poster: similarity is not a semantic pass rate), Shen (arXiv:2607.27674:
the judge accepted 4 of the 5 structurally invalid resolutions), AgenticFlict
(arXiv:2604.03551: 27.67% of 107K+ simulated agent PRs conflict), and the GitButler post
(Scott Chacon, 2025).
