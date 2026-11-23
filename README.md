# Silicon Empire

A hardware tycoon simulation game. You found a semiconductor company, design CPUs, research new technology, hire staff, win contracts, and keep your investors and bank happy.

- **Pilot version:** browser game
- **Full version:** desktop game on Steam

> **Status:** Phase 1 (First Slice) is built: main menu, New Game flow, dashboard shell with a running clock, settings, and save/load/export/import. Next is [Phase 2: Core loop](#7-roadmap).

## Getting Started

**Play the pilot online:** https://pablosarkar.github.io/Silicon-Empire/ (live once GitHub Pages is switched on; see [Deployment](#deployment)).

Requires Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev        # start the game at http://localhost:5173
```

```bash
npm test           # run unit tests (Vitest)
```

```bash
npm run build      # typecheck + production build into dist/
```

`npm run typecheck` runs the TypeScript checker on its own. Run `npm run typecheck`, `npm test` and `npm run build` before every commit.

### Deployment

The pilot is hosted on **GitHub Pages** (D-022) by the workflow `.github/workflows/deploy-pages.yml`:

- **Every push** to any branch runs typecheck, tests and build. A failing check shows as a red ✗ on the commit.
- **Pushes to the default branch** also deploy the built game to https://pablosarkar.github.io/Silicon-Empire/. The default branch is currently `claude/youthful-clarke-so4z10`; if it changes to `main`, the workflow follows automatically.
- A deployment can also be started by hand: repository **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**.
- **One-time setup (owner):** repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. Until this is set, the deploy job fails.
- Saves on the hosted version are stored in each player's own browser for the `pablosarkar.github.io` site. Players can move them with Export/Import.

---

## Table of Contents

0. [Getting Started](#getting-started)
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

#### 2.2.1 CEO Archetypes (D-011)

| Archetype | Effects | Attracts employees who… |
|---|---|---|
| **Research CEO** | Tech tree progress boost (**major**) | like research |
| **Technical CEO** | Tech tree progress boost (**minor**); design and production speed boost (**major**) | like engineering/production |
| **Business CEO** | Better contract chances; investor reputation boost; company reputation boost; better employee happiness | are MBAs (see Q-8) |
| **Marketing CEO** | Better contract chances; better analyst reputation; higher product popularity **with mainstream consumers** | *not yet specified* (see Q-9) |

The exact percentages for "major" and "minor" are set during balancing (see Q-10).

### 2.3 Dashboard
- New Hardware (CPU)
- Research
- Employees/Recruiting
- Foundry/Fab Contracts. For now production is **rented** from third-party fabs only; owning a fab is out of scope (D-013).
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
- **Stats** (D-012)

  | Stat | Effect |
  |---|---|
  | Engineering | Jack of all trades: helps design, production and research |
  | Design | Speeds up chip design time |
  | Production | Better quality control (QC) and faster manufacturing |
  | Research | Speeds up tech tree progress |
  | Marketing | Makes chips more popular |
  | Finance | Higher credit score; better profit margins on contracts |
  | Business | Easier contract negotiation; better employee happiness |
  | Charisma | Better employee happiness within that employee's branch (see Q-7) |

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

### 2.10 Setting and Competition
- **The game starts in 1975** (D-014). Starting technology, such as process nodes and clock speeds, should fit that era.
- **Rival AI companies compete for market share** (D-015). Rival names and branding must be **fictional**, never real companies.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Type checking catches errors in game data, such as contract requirements and research nodes |
| UI framework | **React**, built with **Vite** | Well suited to menu-, table- and chart-heavy tycoon interfaces |
| Styling and components | **Plain CSS** (`src/ui/styles.css`) and native HTML controls (D-016) | Plain, utilitarian look the owner asked for; no styling dependencies |
| State (UI side) | **Zustand** | Lightweight store the UI reads simulation state from |
| Research tree view | **React Flow** *(planned, Phase 2)* | Pan and zoom node graph |
| Charts | **Recharts** *(planned, Phase 3)* | Share price, profit and sales history |
| Tables | **TanStack Table** *(planned, if plain tables become insufficient)* | Sortable and filterable Products list and employee roster |
| Tests | **Vitest** | Unit tests, plus headless multi-year balance simulations |
| Pilot hosting | **GitHub Pages** now (D-022); **itch.io** later for public playtests | Free; deploys automatically on every push to the default branch |
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

### 4.1.1 Code map (as built in Phase 1)

| File | Purpose |
|---|---|
| `src/main.tsx` | Entry point; mounts the React app |
| `src/sim/types.ts` | `GameState` and related types. Any change here means bumping `SAVE_VERSION` (see `src/save/saveFile.ts`) |
| `src/sim/game.ts` | `createNewGame`, `validateNewGame`, `tick` (one week), `addEvent`. All pure functions |
| `src/sim/calendar.ts` | Week number ↔ calendar date (week 0 = 1 Jan 1975) |
| `src/sim/rng.ts` | Seeded random number generator (mulberry32). Use it for all game randomness; never `Math.random` inside `src/sim/` |
| `src/data/balance.ts` | Balance constants (starting cash, boost sizes). All placeholders until balancing |
| `src/data/archetypes.ts` | The four CEO archetypes, their displayed effects and numeric modifiers |
| `src/platform/types.ts` | Platform adapter interfaces: `SaveStorage`, `SettingsStorage`, `Achievements`, `FileExport` |
| `src/platform/browser.ts` | Browser implementations (IndexedDB, localStorage, logged achievements, file download) |
| `src/platform/index.ts` | Chooses the active platform. The Steam build will switch it here |
| `src/save/saveFile.ts` | Save file format, `SAVE_VERSION`, migrations, structural validation |
| `src/save/saveManager.ts` | Save slots: save, load, list, export, import |
| `src/ui/store.ts` | Zustand store: current screen, game, pause/speed, settings, save actions |
| `src/ui/useGameClock.ts` | Continuous clock and the Space / 1–3 keyboard shortcuts |
| `src/ui/settings.ts` | Settings type, defaults and parsing |
| `src/ui/screens/*.tsx` | `MainMenu`, `NewGame`, `LoadGame`, `Settings`, `Dashboard` |
| `src/ui/components/LogoMark.tsx` | Renders a company logo as SVG |
| `src/ui/styles.css` | All styling. Follow the rules at the top of the file |
| `**/*.test.ts` | Vitest tests next to the code they test |

**Save slots (D-018):** each playthrough has one manual slot (`manual-<gameId>`) and one autosave slot (`auto-<gameId>`). Importing a save file writes it to the manual slot of that playthrough.

### 4.2 Time model (D-010)
- **1 tick = 1 in-game week.**
- **Continuous simulation:** the clock runs on its own. The player never has to advance each week by hand.
- Player speed controls: pause, 1×, 2×, 3×.
- Research, chip development, fab production and contract deadlines are all measured in weeks.
- At 1× speed one week takes 1 real second (`MS_PER_WEEK_AT_1X` in `src/ui/store.ts`, placeholder, D-019). 2× and 3× divide that by the speed.
- The game starts paused, pauses while the Settings screen is open, and (by default) pauses when the browser tab is hidden.

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
5. **Desktop-first layout:** minimum 1280×720, keyboard shortcuts (Space = pause, 1–3 = speed), and a fullscreen toggle.
6. **Pilot feedback:** an in-game "Send feedback" link, plus optional anonymous analytics such as progress reached and quit points, to tune the economy before the Steam launch.

---

## 6. UI/UX Plan

### 6.1 Layout
- **Top bar (always visible):** cash, date, share price, investor goodwill, speed controls
- **Left sidebar:** the eight Dashboard sections as navigation
- **Main panel:** the active screen
- **Notifications:** pop-up alerts plus a scrollable event log (e.g. "Contract deadline in 2 weeks", "Research complete: 14nm")

### 6.2 Visual style (D-017)
Plain and utilitarian, like a classic management sim or desktop application. The owner asked for a barebones look, not a "vibecoded" one.

- Light grey background, off-white panels, one muted blue accent (`#1f4e79`)
- System fonts; monospaced, tabular numbers for dates and money
- 1px borders, 2px corner radius, native form controls
- **Not allowed:** gradients, drop shadows, glow, glassmorphism, emoji icons, decorative animation, neon colours
- All colours are CSS variables at the top of `src/ui/styles.css`. Add new ones there instead of hard-coding colours in components.

This replaces the earlier dark "silicon lab" proposal, which was never approved.

### 6.3 Screens that need the most UX work
1. **New Hardware (CPU) designer.** This is the core of the game. Sliders for clock speed, core count, process node and voltage, with a live preview of the trade-offs (speed ↑ → power ↑ → heat ↑), estimated cost per unit, and which open contracts the design would meet.
2. **Contracts.** Each requirement (power, thermal, speed, timeline, price) shown next to your best chip's specs, with ✅ or ❌ per row.
3. **Investors.** A progress bar of year-to-date profit against the board's expectation.
4. **Logo creator.** Kept simple: icon shape, two colours and a font, rendered as SVG. No freehand drawing.

---

## 7. Roadmap

### Phase 0: Planning ✅
Tech stack, architecture and UI direction agreed (see Decision Log).

### Phase 1: First Slice ✅
1. Vite + React + TypeScript project with the `sim/`, `data/`, `ui/`, `platform/` and `save/` folders
2. Main Menu: New Game, Load Game, Settings
3. New Game flow: CEO Archetype, Logo (shape, two colours, font, 1–3 characters), Company name, CEO name
4. Dashboard shell: top bar (company, date, cash, share price and goodwill placeholders, pause/1×/2×/3×, Save, Settings, Main Menu), sidebar with Overview plus the eight sections (placeholders listing planned contents), event log
5. Save and load through the browser storage adapter, autosave, plus export and import of save files
6. Settings: autosave interval, pause when tab hidden, fullscreen toggle, keyboard shortcut list
7. 17 unit tests (calendar, RNG, new game, tick, save format, save slots, IndexedDB adapter, settings)

### Phase 2: Core loop (next)
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
| D-002 | 2026-11-23 | Claude | Use **React + Vite** for the UI, with **Tailwind + shadcn/ui** | Fast development of a dashboard-style interface | React + Vite: Accepted. Tailwind + shadcn/ui: superseded by D-016 |
| D-003 | 2026-11-23 | Claude | **No database server.** Saves are versioned JSON; content lives in typed data files | Single-player game; a database adds complexity with no benefit | Accepted |
| D-004 | 2026-11-23 | Owner | **Pilot is a browser game; the full game ships on Steam** | Easy to share and test the pilot, then a commercial release | Accepted |
| D-005 | 2026-11-23 | Claude | Use **Electron + steamworks.js** for the Steam build (supersedes the earlier Tauri suggestion) | Mature Steam integration; Steam overlay works more reliably than in Tauri, which uses the system's built-in browser engine | Accepted |
| D-006 | 2026-11-23 | Claude | **Keep the simulation (`src/sim/`) separate from the UI and platform** | Headless balance tests, deterministic replays, painless move to Steam | Accepted |
| D-007 | 2026-11-23 | Claude | **1 tick = 1 in-game week**, with pause, 1×, 2× and 4× speed | Good granularity for research, production and contract deadlines | Superseded by D-010 |
| D-008 | 2026-11-23 | Claude | **Platform adapters** for save storage and achievements, defined from day one | Switch from IndexedDB to files and Steam Cloud without changing game code | Accepted |
| D-009 | 2026-11-23 | Claude | **Seeded random number generator** stored in the save | Reproducible games for debugging and bug reports | Accepted |
| D-010 | 2026-11-23 | Owner | **1 tick = 1 in-game week, continuous simulation, speeds pause/1×/2×/3×.** Supersedes D-007. | Owner confirmed the weekly tick; time runs on its own instead of being advanced by hand; 3× is the top speed instead of 4× | Accepted |
| D-011 | 2026-11-23 | Owner | **Four CEO archetypes: Research, Technical, Business, Marketing** (details in §2.2.1) | Owner's design; answers Q-1 | Accepted |
| D-012 | 2026-11-23 | Owner | **Eight employee stats: Engineering, Design, Production, Research, Marketing, Finance, Business, Charisma** (details in §2.5) | Owner's design; answers Q-3 | Accepted |
| D-013 | 2026-11-23 | Owner | **No player-owned fabs for now. All production is rented from third-party foundries.** | Keeps scope small; owning a fab may come later | Accepted |
| D-014 | 2026-11-23 | Owner | **The game starts in 1975** | Answers Q-5 | Accepted |
| D-015 | 2026-11-23 | Owner | **Rival AI companies compete for market share.** Their names must be fictional. | Answers Q-6. The fictional-names rule (Claude) avoids using real companies' trademarks | Accepted |
| D-016 | 2026-11-23 | Claude | **Plain CSS and native HTML controls instead of Tailwind + shadcn/ui.** Supersedes the styling part of D-002. | Owner asked for a barebones, non-"vibecoded" UI. Component libraries push towards a generic modern-web look and add dependencies | Accepted (follows owner request) |
| D-017 | 2026-11-23 | Owner | **Barebones, utilitarian visual style** (rules in §6.2) | Owner request when starting Phase 1 | Accepted |
| D-018 | 2026-11-23 | Claude | **One manual and one autosave slot per playthrough** (`manual-<id>`, `auto-<id>`); export/import as JSON files | Simple to understand; autosave never overwrites a manual save | Proposed (owner to confirm) |
| D-019 | 2026-11-23 | Claude | **1 week = 1 real second at 1×** (placeholder) | A year passes in under a minute at 1×; will be tuned once there is gameplay to pace | Proposed (owner to confirm) |
| D-020 | 2026-11-23 | Claude | **Placeholder balance values:** starting cash $250,000; major boost +25%; minor boost +10%; unspecified archetype boosts ("better contract chances", etc.) use the minor value | Needed to build against; all live in `src/data/balance.ts` | Proposed (to be tuned) |
| D-021 | 2026-11-23 | Claude | **Minimum layout width 1280px** | Desktop-first (README §5 rule 5); the game is not designed for phones | Accepted |
| D-022 | 2026-11-23 | Owner | **Host the pilot on GitHub Pages**, deployed by GitHub Actions from the default branch. Every push also runs typecheck, tests and build. | Owner request. Free hosting for a public repo; automatic deploys keep the hosted build current. itch.io remains the plan for wider playtests | Accepted |

---

## 9. Open Questions

| # | Question | Raised by | Notes |
|---|---|---|---|
Q-1 to Q-6 were answered on 2026-11-23; see D-010 to D-015.

| # | Question | Raised by | Notes |
|---|---|---|---|
| Q-7 | What is a "branch" for the Charisma stat? Is it the employee's department (R&D, Design, HR, …) or something else? | Claude | Decides whose happiness a charismatic employee improves. |
| Q-8 | The Business CEO "attracts MBAs". Is MBA a new employee type, or a trait on existing types (e.g. Negotiators, Sales Experts with a high Business stat)? | Claude | MBA is not in the employee type list in §2.5. |
| Q-9 | Which employees does the Marketing CEO attract? | Claude | The other three archetypes each attract a group; this one doesn't say. Suggestion: employees who like marketing (Sales Experts / high Marketing stat). |
| Q-10 | How big are "major" and "minor" boosts? | Claude | Suggested starting point for balancing: major = +25%, minor = +10%. To be tuned with the headless balance tests. |
| Q-11 | How many rival companies are there, and do new rivals appear over time? | Claude | Affects market simulation complexity. |
| Q-12 | Does the 1975 timeline follow real-world technology history (e.g. process nodes shrinking on a realistic schedule) or a looser, game-paced version? | Claude | Affects research tree pacing. |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-11-23 | Claude | Created README with the owner's game design spec, tech stack, architecture, Steam-readiness rules, UI/UX plan, roadmap, decision log, open questions and collaboration protocol. |
| 2026-11-23 | Claude | Added `AGENTS.md`, which points every AI agent to this README and its collaboration protocol. |
| 2026-11-23 | Claude | Recorded the owner's answers to Q-1 to Q-6 as D-010 to D-015. Added CEO archetypes (§2.2.1), employee stats (§2.5), the rented-fabs-only rule (§2.3) and Setting and Competition (§2.10). Updated the time model (§4.2) and speed shortcuts (§5). D-007 marked superseded. Added follow-up questions Q-7 to Q-12. |
| 2026-11-23 | Claude | **Built Phase 1 (First Slice).** Project setup (Vite, React, TypeScript, Zustand, idb-keyval, Vitest); sim core (types, calendar, seeded RNG, new game, weekly tick); CEO archetype data; platform adapters (IndexedDB saves, localStorage settings, logged achievements, file download); versioned save format with validation; screens: Main Menu, New Game, Load Game (load/export/delete/import), Settings, Dashboard (top bar, sidebar, placeholders, event log); continuous clock with Space and 1–3 shortcuts; autosave; 17 unit tests. Added Getting Started, code map (§4.1.1), visual style rules (§6.2) and decisions D-016 to D-021. Tested in Chromium: new game → run at 3× → save → quit → load restores the same date, with no console errors. Added rules 8–11 to `AGENTS.md` (checks before commit, style rules, seeded RNG only, save migrations). |
| 2026-11-23 | Claude | Added GitHub Pages hosting (D-022): `.github/workflows/deploy-pages.yml` checks every push and deploys the default branch. Added the play link and a Deployment section under Getting Started; updated the pilot hosting row in §3. Owner still needs to set Settings → Pages → Source to "GitHub Actions" once. |
