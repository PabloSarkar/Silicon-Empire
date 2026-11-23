# Silicon Empire

A hardware tycoon simulation game. You found a semiconductor company, design CPUs, research new technology, hire staff, win contracts, and keep your investors and bank happy.

- **Pilot version:** browser game
- **Full version:** desktop game on Steam

> **Status:** Planning complete, no code written yet. The next step is the [First Slice](#7-roadmap).

---

## Table of Contents

1. [Collaboration Protocol (read first)](#1-collaboration-protocol-read-first)
2. [Game Design Specification](#2-game-design-specification)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Steam-Readiness Rules](#5-steam-readiness-rules)
6. [UI/UX Plan](#6-uiux-plan)
7. [Roadmap](#7-roadmap)
8. [Decision Log](#8-decision-log)
9. [Open Questions](#9-open-questions)
10. [Changelog](#10-changelog)

---

## 1. Collaboration Protocol (read first)

More than one AI agent works on this project (Claude Code and an external ChatGPT agent), along with the human project owner. To keep everyone in sync:

1. **This README is the source of truth.** Read it before you start any work. If code and README disagree, flag it and don't guess.
2. **Record every planning decision** in the [Decision Log](#8-decision-log). Give each decision a new ID (`D-###`), the date, who made it, and the reasoning. Never silently rewrite an old decision. If a decision changes, add a new entry that says `Supersedes D-###` and mark the old one `Superseded`.
3. **Record every change** in the [Changelog](#10-changelog): date, author (agent or human), and a short summary of what changed and why.
4. **Open questions** go in [Open Questions](#9-open-questions). Remove an item once it is answered and record the answer as a decision.
5. **The project owner has final say.** Agents may propose changes. Anything that changes the game design or tech stack needs the owner's approval before it is marked `Accepted`.
6. **Git workflow**
   - Work on a feature branch, never directly on `main`.
   - Keep commits small and focused. Explain *why* in the commit message, not only *what*.
   - Commit README updates (decision log and changelog) together with the code they describe.
7. **Author tags:** use `Claude`, `ChatGPT`, or `Owner` in the Decision Log and Changelog.

---

## 2. Game Design Specification

This is the owner's original spec, kept as written. Items marked *(proposed)* are agent suggestions still awaiting approval.

### 2.1 Main Menu
- New Game
- Load Game
- Settings

### 2.2 Main Menu → New Game
- Choose CEO Archetype
- Logo
- Company name
- CEO name

### 2.3 Dashboard
- New Hardware (CPU)
- Research
- Employees/Recruiting
- Foundry/Fab Contracts
- Contracts
- Products
- Investors
- Bank

### 2.4 Research Tree
- Process Nodes
- Instruction Sets (Architecture)
- Socket and Standards
- Clock Speeds
- Power Management
- Thermal Management

### 2.5 Employees and Recruiting
- **Stats**
  - Engineering
- **Types of employees**
  - Researchers (R&D)
  - Engineers (jack of all trades)
  - Designers (chip design)
  - HR (employees)
  - Negotiators (contracts)
  - Sales Experts (profit margins)
  - Tax Specialists (tax reduction)

### 2.6 Products
- List of all previous hardware
- Number sold
- Profit
- Analyst
- Inspection (chip specs)

### 2.7 Investors
- The board the company answers to
- The board sets a profit expectation each year
- Beating the expectation earns a cash reward
- Missing the expectation reduces the investors' goodwill

### 2.8 Bank
- Loans
- Finances
  - Profit
  - Share price
  - Shareholders
- Credit score (longer loans mean a lower credit score)

### 2.9 Contracts
- Companies offering contracts
  - Each contract has specific demands: power, thermal, speed, timeline, and price
- Company reputation goes up or down with each contract you complete or fail

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Type checking catches errors in game data, such as contract requirements and research nodes |
| UI framework | **React**, built with **Vite** | Well suited to menu-, table- and chart-heavy tycoon interfaces |
| Styling and components | **Tailwind CSS** + **shadcn/ui** (Radix) | Ready-made accessible sliders, dialogs, tabs and tooltips |
| State (UI side) | **Zustand** | Lightweight store the UI reads simulation state from |
| Research tree view | **React Flow** | Pan and zoom node graph |
| Charts | **Recharts** | Share price, profit and sales history |
| Tables | **TanStack Table** | Sortable and filterable Products list and employee roster |
| Tests | **Vitest** | Unit tests, plus headless multi-year balance simulations |
| Pilot hosting | **itch.io** (playtests); Netlify or GitHub Pages also fine | Free, easy to share |
| Steam desktop wrapper | **Electron** + **steamworks.js** | Mature Steam integration (achievements, Steam Cloud, overlay) |

**Database: none.** This is a single-player game, so it doesn't need a database server.

| Need | Solution |
|---|---|
| Game content (research nodes, archetypes, rival companies, contract templates) | Typed data files in `src/data/` |
| Save games | Entire game state serialized to JSON, with a `saveVersion` field |
| Pilot save storage | IndexedDB (via `idb-keyval`), plus export and import of save files |
| Steam save storage | JSON files on disk, synced with Steam Cloud |
| Settings | Small JSON blob (`localStorage` in the pilot, a file on Steam) |
| Randomness | Seeded random number generator whose seed is stored in the save, so a loaded game reproduces the same events |

---

## 4. Architecture

### 4.1 Core principle: the simulation is separate from the UI

```
src/
  sim/        Pure TypeScript game logic. No React, no browser APIs.
              Time ticks, economy, research, contracts, investors, bank.
  data/       Static game content (research tree, CEO archetypes, employee
              types, rival companies, contract templates).
  ui/         React screens and components. Reads sim state; sends player
              actions to the sim.
  platform/   Platform adapters (save storage, achievements). Browser
              versions for the pilot; Electron/Steam versions later.
  save/       Serialization, save versioning, migrations between versions.
```

Why it is built this way:
- Balance tests can run 20+ in-game years in seconds with no UI.
- The game is deterministic: same seed plus same player actions gives the same result, which helps debugging and bug reports.
- Moving the game to Electron and Steam doesn't require touching game logic.

### 4.2 Time model *(proposed, see D-007)*
- **1 tick = 1 in-game week.**
- Player speed controls: pause, 1×, 2×, 4×.
- Research, chip development, fab production and contract deadlines are all measured in weeks.

### 4.3 Data flow
```
Player action (UI) → sim.dispatch(action) → sim updates GameState
Clock tick         → sim.tick()           → sim updates GameState
GameState change   → Zustand store         → React re-renders
```

---

## 5. Steam-Readiness Rules

These rules apply from day one, even in the browser pilot, so moving to Steam is painless.

1. **Platform features go through interfaces in `src/platform/`.** Game code never calls IndexedDB, the file system or Steamworks directly.
   ```ts
   interface SaveStorage  { save(slot: string, data: string): Promise<void>;
                            load(slot: string): Promise<string | null>;
                            list(): Promise<string[]>;
                            delete(slot: string): Promise<void>; }
   interface Achievements { unlock(id: string): void; }
   ```
2. **Call achievement hooks from the start**, for example `unlock("first_cpu_shipped")`. In the pilot they are only logged.
3. **`src/sim/` must stay platform-free.** No `window`, `document`, `localStorage` or React.
4. **Every save carries a `saveVersion`.** Save format changes come with a migration in `src/save/`, so pilot saves can still load in the Steam version.
5. **Desktop-first layout:** minimum 1280×720, keyboard shortcuts (Space = pause, 1–4 = speed), and a fullscreen toggle.
6. **Pilot feedback:** an in-game "Send feedback" link, plus optional anonymous analytics such as progress reached and quit points, to tune the economy before the Steam launch.

---

## 6. UI/UX Plan

### 6.1 Layout
- **Top bar (always visible):** cash, date, share price, investor goodwill, speed controls
- **Left sidebar:** the eight Dashboard sections as navigation
- **Main panel:** the active screen
- **Notifications:** pop-up alerts plus a scrollable event log (e.g. "Contract deadline in 2 weeks", "Research complete: 14nm")

### 6.2 Visual style
A dark "silicon lab" look: near-black backgrounds, green or cyan accents inspired by circuit traces, and monospaced numbers so values line up in tables.

### 6.3 Screens that need the most UX work
1. **New Hardware (CPU) designer.** This is the core of the game. Sliders for clock speed, core count, process node and voltage, with a live preview of the trade-offs (speed ↑ → power ↑ → heat ↑), estimated cost per unit, and which open contracts the design would meet.
2. **Contracts.** Each requirement (power, thermal, speed, timeline, price) shown next to your best chip's specs, with ✅ or ❌ per row.
3. **Investors.** A progress bar of year-to-date profit against the board's expectation.
4. **Logo creator.** Kept simple: icon shape, two colours and a font, rendered as SVG. No freehand drawing.

---

## 7. Roadmap

### Phase 0: Planning ✅
Tech stack, architecture and UI direction agreed (see Decision Log).

### Phase 1: First Slice (next)
1. Vite + React + TypeScript + Tailwind project with the `sim/`, `data/`, `ui/`, `platform/` and `save/` folders
2. Main Menu: New Game, Load Game, Settings
3. New Game flow: CEO Archetype, Logo, Company name, CEO name
4. Empty Dashboard shell with the top bar (cash, date, speed controls) and the sidebar
5. Save and load through the browser storage adapter, plus export and import of save files

### Phase 2: Core loop
CPU designer → fab production → sales → Products screen; Research tree; Employees.

### Phase 3: Business layer
Contracts and reputation, Investors and goodwill, Bank (loans, credit score, share price).

### Phase 4: Pilot release
Balance pass, feedback link, itch.io release.

### Phase 5: Steam
Electron wrapper, steamworks.js (achievements, Steam Cloud), file-based saves, store page.

---

## 8. Decision Log

| ID | Date | Author | Decision | Reasoning | Status |
|---|---|---|---|---|---|
| D-001 | 2026-11-23 | Claude | Use **TypeScript** as the language | The game is UI-heavy (menus, tables, charts), which is web technology's strength; type checking protects game data | Accepted |
| D-002 | 2026-11-23 | Claude | Use **React + Vite** for the UI, with **Tailwind + shadcn/ui** | Fast development of a dashboard-style interface | Accepted |
| D-003 | 2026-11-23 | Claude | **No database server.** Saves are versioned JSON; content lives in typed data files | Single-player game; a database adds complexity with no benefit | Accepted |
| D-004 | 2026-11-23 | Owner | **Pilot is a browser game; the full game ships on Steam** | Easy to share and test the pilot, then a commercial release | Accepted |
| D-005 | 2026-11-23 | Claude | Use **Electron + steamworks.js** for the Steam build (supersedes the earlier Tauri suggestion) | Mature Steam integration; Steam overlay works more reliably than in Tauri, which uses the system's built-in browser engine | Accepted |
| D-006 | 2026-11-23 | Claude | **Keep the simulation (`src/sim/`) separate from the UI and platform** | Headless balance tests, deterministic replays, painless move to Steam | Accepted |
| D-007 | 2026-11-23 | Claude | **1 tick = 1 in-game week**, with pause, 1×, 2× and 4× speed | Good granularity for research, production and contract deadlines | Proposed (owner to confirm) |
| D-008 | 2026-11-23 | Claude | **Platform adapters** for save storage and achievements, defined from day one | Switch from IndexedDB to files and Steam Cloud without changing game code | Accepted |
| D-009 | 2026-11-23 | Claude | **Seeded random number generator** stored in the save | Reproducible games for debugging and bug reports | Accepted |

---

## 9. Open Questions

| # | Question | Raised by | Notes |
|---|---|---|---|
| Q-1 | What are the CEO archetypes and their bonuses? | Claude | Example ideas: "Engineer Founder" (cheaper research), "Wall Street CEO" (better investor goodwill). The owner can supply their own, or an agent can draft 4–5 for review. |
| Q-2 | Confirm the time model (D-007: 1 tick = 1 week)? | Claude | |
| Q-3 | Which employee stats exist besides Engineering? | Claude | The spec lists only "Engineering" so far. |
| Q-4 | How do Foundry/Fab Contracts work? Do you rent capacity from third-party fabs, can you build your own fab later, or both? | Claude | Affects the economy model. |
| Q-5 | Is there a starting year or historical era (e.g. 1970s → present), or is the timeline fictional? | Claude | Affects the starting process node and research pacing. |
| Q-6 | Are there rival AI companies competing for market share? | Claude | Affects sales and the Analyst feature. |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-11-23 | Claude | Created README with the owner's game design spec, tech stack, architecture, Steam-readiness rules, UI/UX plan, roadmap, decision log, open questions and collaboration protocol. |
| 2026-11-23 | Claude | Added `AGENTS.md`, which points every AI agent to this README and its collaboration protocol. |
