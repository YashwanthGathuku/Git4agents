# ICSE 2027 Tool Demonstrations and Data Showcase — submission checklist

Track page: https://conf.researchr.org/track/icse-2027/icse-2027-demonstrations
(read 2026-10-18). **Deadline: Friday 23 October 2026, Anywhere on Earth.**
Notification 11 December 2026; camera-ready 20 January 2027.

| Requirement (from the call) | Status |
|---|---|
| At most 4 pages of main text, inclusive of all references, figures, tables, appendices | `main.pdf` is 4 pages including references |
| IEEE conference format | `IEEEtran.cls` V1.8b, `\documentclass[conference]{IEEEtran}` |
| Single-anonymous review: author names included | Included |
| 3–5 minute video on YouTube, accessible during review | **To do** — `VIDEO_SCRIPT.md`; then replace `https://youtu.be/VIDEO-ID` in the abstract |
| Relevance, soundness, novelty, video quality, usefulness, related literature | Sections I–VI |

## Before you submit

1. **Affiliation.** The author block says "Independent researcher, Cleveland, Ohio, USA".
   Change it if you submit under an organisation.
2. **Video URL.** Upload the video, then set it in the abstract.
3. **AI-use disclosure.** IEEE policy asks for AI-generated content to be disclosed in
   the acknowledgments; the paper has one sentence. Check the ICSE 2027 call for any
   additional wording it requires.
4. **Code state.** The paper describes the `governed-resolution` branch (draft PRs #2
   and #3). Merge them, or tag the commit the paper describes, before the deadline.
5. Build: `pdflatex main && bibtex main && pdflatex main && pdflatex main`.
