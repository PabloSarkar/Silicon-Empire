# Instructions for AI Agents

This project is developed by several AI agents (Claude Code and an external ChatGPT agent) together with the human project owner.

**Before doing any work, read [`README.md`](README.md) in full.** It is the single source of truth for the game design, tech stack, architecture and all planning decisions.

## Mandatory rules

1. Follow the **Collaboration Protocol** in README section 1.
2. Log every planning decision in the README **Decision Log** (section 8) with a new `D-###` ID. Never rewrite an old decision; add a new one that supersedes it.
3. Log every change in the README **Changelog** (section 10) with the date, your author tag (`Claude`, `ChatGPT` or `Owner`) and a short summary.
4. Add unresolved questions to **Open Questions** (section 9).
5. Changes to the game design or tech stack need the owner's approval before they are marked `Accepted`.
6. Keep `src/sim/` free of UI and browser code (see README sections 4 and 5).
7. Work on feature branches, never directly on `main`. Commit README updates together with the code they describe.
