# Silicon Empire

A hardware tycoon simulation game. You found a semiconductor company, design CPUs, research new technology, hire staff, win contracts, and keep your investors and bank happy.

- **Pilot version:** browser game
- **Full version:** desktop game on Steam

> **Status:** The **pilot is playable** (Phases 2 and 3 built together, D-024): design CPUs, research, hire, rent foundry production, launch and sell against rival companies, win contracts, and keep the board and the bank happy from 1975 onwards. Balance is a first pass. Next is [Phase 4: Pilot release](#7-roadmap). Gameplay rules as built: [§2.11](#211-pilot-gameplay-as-built).

## Getting Started

**Play the pilot online:** https://pablosarkar.github.io/Silicon-Empire/ (see [Deployment](#deployment)).

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
- **One-time setup (done 2026-11-23):** repository **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**. If it is ever switched back to "Deploy from a branch", deploys fail with "Ensure GitHub Pages has been enabled".
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

### 2.11 Pilot gameplay (as built)

The pilot is a genre game in the spirit of hardware tycoon games; all names, data and content are original (D-023). This section describes the rules the code implements. Numbers live in `src/data/` and are first-pass balance values (D-031).

**The loop:** research technology → design a CPU → rent production at a foundry → launch it at a price → it sells against rival chips → profit funds more staff and research → the board reviews you each year.

| System | How it works | Code |
|---|---|---|
| Time | 1 week per tick (D-010); the year closes on the first week of January: tax, board review, new target. | `sim/game.ts` |
| Research | Six categories, each a chain of tiers (§2.4). A tier needs the previous tier and its **year** to have arrived (D-025). Pay cash when you first start a tier; research points come from staff every week. Progress is kept if you switch. 86 tiers from 1975 to 2023. | `data/research.ts`, `sim/research.ts` |
| CPU design | Pick process, architecture (data width), researched features, socket, cores and clock. The model gives transistors, die area, performance (MIPS), power, temperature, yield, unit cost, design work and mask cost. Power must fit the socket; above 85 °C a chip is "hot", above 95 °C "unstable" (big sales and review penalty). One design in development at a time (D-033). | `sim/cpu.ts`, `ui/screens/game/Designer.tsx` |
| Foundries | Three fictional foundries, each with a price multiplier, defect rate, lead time, minimum order, and a lag before it offers new processes (D-013: no owned fabs). Production quality from staff lowers defects and lead time. | `data/market.ts`, `sim/production.ts` |
| Market | Weekly demand grows over time. Buyers are split into Budget, Mainstream and Enthusiast segments that weigh price and performance differently; every chip on sale (yours and rivals') competes, and some buyers don't buy at all. Brand strength comes from reputation, the analyst review, marketing staff, and the Marketing CEO's mainstream bonus. Retailers keep a cut that Sales Experts reduce. | `sim/market.ts` |
| Rivals | Three fictional rivals (D-030) release chips every 40–80 weeks using the technology available to them (0–2 years behind the frontier), aimed at their segments. | `sim/market.ts` |
| Analysts | Each launch gets a 0–10 review based on performance vs. the best rival, value for money, heat and power. Good reviews raise reputation; bad ones lower it. | `sim/market.ts` |
| Reputation | 0–100. Drifts toward a level set by your market share; contracts and reviews move it up or down. | `sim/market.ts`, `sim/contracts.ts` |
| Employees | Seven roles and eight stats (§2.5). Candidates refresh every 4 weeks; the CEO's archetype attracts certain roles (D-026). Staff produce research and design points, production quality, marketing, negotiation, contract margins, a lower retailer cut, a lower tax rate and credit score drift. Happiness affects productivity; very unhappy staff may quit. The CEO also works. | `data/employees.ts`, `sim/employees.ts` |
| Contracts | Fictional clients offer orders with minimum performance, maximum power, maximum temperature, deadline and price. Bid (win chance from reputation, negotiation and relationship), then deliver from stock before the deadline. Missing it costs a penalty, reputation and relationship. | `data/market.ts`, `sim/contracts.ts` |
| Investors | Each year the board sets a net profit target (year one allows a loss). Beating it pays a cash bonus and raises goodwill; missing it lowers goodwill. Goodwill 0 = game over (D-032). You can sell new shares once a year (dilutes your stake). | `sim/finance.ts` |
| Bank | Loans of 1, 2, 5 or 10 years; interest rate from credit score and term. Taking a loan lowers the credit score, more for longer loans. Paying on time raises it. 12 weeks of negative cash = bankruptcy (D-032). | `sim/finance.ts` |
| Share price | Company value (cash − debt + 8× trailing profit + a reputation term) ÷ shares. | `sim/finance.ts` |
| Achievements | The sim records ids (e.g. `first_cpu_shipped`, `first_contract`, `millionaire`); the UI forwards them to the platform adapter (README §5 rule 2). | `sim/events.ts`, `ui/store.ts` |

**Playing it (for testers):** Overview has a "Getting started" checklist. Hire a few staff, start research, design a chip under New Hardware, order production under Foundry / Fab Contracts, then launch it under Products. The game pauses itself on important events (Settings). Space pauses, 1–3 set the speed.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Type checking catches errors in game data, such as contract requirements and research nodes |
| UI framework | **React**, built with **Vite** | Well suited to menu-, table- and chart-heavy tycoon interfaces |
| Styling and components | **Plain CSS** (`src/ui/styles.css`) and native HTML controls (D-016) | Plain, utilitarian look the owner asked for; no styling dependencies |
| State (UI side) | **Zustand** | Lightweight store the UI reads simulation state from |
| Research tree view | Tabbed tables per category (D-028); React Flow not needed because every category is a linear chain | Simpler, matches the plain style |
| Charts | Small hand-written SVG line chart (D-029) instead of Recharts | Only two simple charts needed; no dependency |
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

### 4.1.1 Code map

| File | Purpose |
|---|---|
| `src/main.tsx` | Entry point; mounts the React app |
| `src/sim/types.ts` | `GameState` and related types. Any change here means bumping `SAVE_VERSION` (see `src/save/saveFile.ts`) |
| `src/sim/game.ts` | `createNewGame`, `initSystems`, `tick` (one week; the order of systems each week is in this function) |
| `src/sim/actions.ts` | Every player action (`startResearch`, `startDesign`, `orderProduction`, `launchProduct`, `hireCandidate`, `bidContract`, `deliverContract`, `takeLoan`, `issueShares`, …). Each returns a new state or throws `ActionError` with a message for the player |
| `src/sim/cpu.ts` | Chip model: `evaluateDesign`, `validateSpec`, `bestDesign`, `referenceDesign` (what rivals and clients use) |
| `src/sim/research.ts` | Research status, research and design progress |
| `src/sim/employees.ts` | Candidates, team output (`teamOutput`), happiness, salaries |
| `src/sim/market.ts` | Rivals, weekly sales by segment, analyst reviews, reputation drift, market share |
| `src/sim/production.ts` | Foundry quotes and deliveries |
| `src/sim/contracts.ts` | Contract offers, bids, deadlines, reputation and client relations |
| `src/sim/finance.ts` | Ledger, loans, credit score, share price, investors, year-end review |
| `src/sim/events.ts` | Event log and achievement helpers |
| `src/sim/random.ts` | Random helpers on the seeded RNG; ids |
| `src/sim/calendar.ts` | Week number ↔ calendar date (week 0 = 1 Jan 1975) |
| `src/sim/rng.ts` | Seeded random number generator (mulberry32). Use it for all game randomness; never `Math.random` inside `src/sim/` |
| `src/sim/bot.ts` | Automatic player used only by balance tests |
| `src/sim/testUtils.ts` | Shared test helpers |
| `src/data/balance.ts` | Balance constants (starting cash, temperatures, tax, bank, investors…). First-pass values |
| `src/data/research.ts` | The research tree: every tier, its year and its effect; research and mask costs |
| `src/data/market.ts` | Market size, segments, rivals, foundries, contract clients (all fictional) |
| `src/data/employees.ts` | Roles, stats, who each CEO attracts, CEO stats, name lists |
| `src/data/archetypes.ts` | The four CEO archetypes, their displayed effects and numeric modifiers |
| `src/platform/types.ts` | Platform adapter interfaces: `SaveStorage`, `SettingsStorage`, `Achievements`, `FileExport` |
| `src/platform/browser.ts` | Browser implementations (IndexedDB, localStorage, logged achievements, file download) |
| `src/platform/index.ts` | Chooses the active platform. The Steam build will switch it here |
| `src/save/saveFile.ts` | Save file format, `SAVE_VERSION`, migrations, structural validation |
| `src/save/saveManager.ts` | Save slots: save, load, list, export, import |
| `src/ui/store.ts` | Zustand store: current screen, game, pause/speed, settings, save actions |
| `src/ui/useGameClock.ts` | Continuous clock and the Space / 1–3 keyboard shortcuts |
| `src/ui/settings.ts` | Settings type, defaults and parsing |
| `src/ui/screens/*.tsx` | `MainMenu`, `NewGame`, `LoadGame`, `Settings`, `Dashboard` (top bar, sidebar with badges, event log, game over) |
| `src/ui/screens/game/*.tsx` | One file per dashboard section: `Overview`, `Designer`, `Research`, `Employees`, `Foundry`, `Contracts`, `Products`, `Market`, `Investors`, `Bank` |
| `src/ui/components/LogoMark.tsx` | Renders a company logo as SVG |
| `src/ui/components/Widgets.tsx` | Progress bar, key/value table, Meets/Fails marker, SVG line chart, section, board target |
| `src/ui/styles.css` | All styling. Follow the rules at the top of the file |
| `**/*.test.ts` | Vitest tests next to the code they test. `src/sim/balance.test.ts` runs a bot for 25 years per CEO type; run it after changing balance numbers |

**Save slots (D-018):** each playthrough has one manual slot (`manual-<gameId>`) and one autosave slot (`auto-<gameId>`). Importing a save file writes it to the manual slot of that playthrough.

### 4.2 Time model (D-010)
- **1 tick = 1 in-game week.**
- **Continuous simulation:** the clock runs on its own. The player never has to advance each week by hand.
- Player speed controls: pause, 1×, 2×, 3×.
- Research, chip development, fab production and contract deadlines are all measured in weeks.
- At 1× speed one week takes 1 real second (`MS_PER_WEEK_AT_1X` in `src/ui/store.ts`, placeholder, D-019). 2× and 3× divide that by the speed.
- The game starts paused, pauses while the Settings screen is open, and (by default) pauses when the browser tab is hidden and when an important event happens (D-035).

### 4.3 Data flow
```
Player action (UI) → store.dispatch(g => action(g, …)) → new GameState (or ActionError shown above the panel)
Clock tick         → store.advanceWeek() → sim tick() → new GameState
GameState change   → Zustand store → React re-renders
```
`tick` and every action copy the state (`structuredClone`) and never mutate their input, so the same seed and the same actions always give the same game.

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
- **Left sidebar:** Overview, the eight Dashboard sections, and Market (D-027), with short badges when something needs attention (e.g. "2 new" contracts, "1 sold out", research "idle")
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

### Phase 2: Core loop ✅ (pilot)
CPU designer → foundry production → sales → Products screen; Research tree; Employees; Market and rivals.

### Phase 3: Business layer ✅ (pilot)
Contracts and reputation, Investors and goodwill, Bank (loans, credit score, share price), game over.

### Phase 4: Pilot release (next)
Owner and tester playtesting, balance pass (D-031), "Send feedback" link (README §5 rule 6), answers to the provisional decisions, itch.io release.

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
| D-023 | 2026-11-25 | Owner | **Build a playable pilot**, a genre game "slightly similar" to existing hardware tycoon games. All names, data and content are original. | Owner request. Genre mechanics are fine; copying another game's specific content is not | Accepted |
| D-024 | 2026-11-25 | Claude | **Pilot covers Phases 2 and 3 in one build** (core loop plus business layer) | A pilot needs the whole loop, including investors and bank, to be playable | Accepted (follows owner request) |
| D-025 | 2026-11-25 | Claude | **Q-12: game-paced history.** Tiers unlock by year, loosely following the real industry (e.g. 10 µm in 1975, 7 nm in 2019). Research can't run ahead of a tier's year; numbers are game values, not real measurements | Gives the 1975 start a sense of history while keeping research meaningful | Proposed (owner to confirm) |
| D-026 | 2026-11-25 | Claude | **Q-7/Q-8/Q-9 interpretations:** a Charisma "branch" is the employee's role; "MBAs" are Negotiators, Sales Experts, Tax Specialists and HR; the Marketing CEO attracts Sales Experts. Attracted roles appear 3× as often with +10 main stats | Needed to build recruiting; easy to change in `src/data/employees.ts` | Proposed (owner to confirm) |
| D-027 | 2026-11-25 | Claude | **Added "Overview" and "Market" sidebar sections** beside the eight from the spec | Overview holds the getting-started checklist and summary; Market shows rivals and market share (D-015) | Proposed (owner to confirm) |
| D-028 | 2026-11-25 | Claude | **Research tree shown as tabbed tables**, not a React Flow graph. Supersedes the React Flow row of §3 | Every category is a linear chain, so a graph adds nothing; fits the plain style (D-017) | Proposed (owner to confirm) |
| D-029 | 2026-11-25 | Claude | **Hand-written SVG line chart** instead of Recharts | Only cash and share price charts are needed; no extra dependency | Proposed (owner to confirm) |
| D-030 | 2026-11-25 | Claude | **Q-11: three fixed rivals** (Varex Microsystems, Orinth Semiconductor, Calder Logic) with different tech lag, prices and segments; no new entrants in the pilot | Enough competition to make pricing and timing matter | Proposed (owner to confirm) |
| D-031 | 2026-11-25 | Claude | **First-pass economy** (market size and growth, segment prices, costs, board target growth, reputation drift). Checked with a bot that plays 25+ years per CEO type: all survive into the 2000s; a passive strategy starts missing board targets after 2000 | Starting point for playtesting; all values in `src/data/` | Proposed (to be tuned) |
| D-032 | 2026-11-25 | Claude | **Game over:** investor goodwill reaches 0 (CEO replaced) or cash stays negative for 12 weeks (bankrupt). No win condition in the pilot; play continues indefinitely | Matches the investor and bank rules in §2.7 and §2.8 | Proposed (owner to confirm) |
| D-033 | 2026-11-25 | Claude | **One chip in development at a time** | Keeps the pilot simple; a larger company could run parallel design teams later | Proposed (owner to confirm) |
| D-034 | 2026-11-25 | Claude | **Save version 2** with a migration from version 1: Phase 1 saves load into the pilot, keeping company, CEO, cash, date and log | AGENTS.md rule 11 | Accepted |
| D-035 | 2026-11-25 | Claude | **"Pause on important events" setting, on by default** (design finished, delivery, launch, contract won/failed, sold out, year-end review) | With a continuous clock, players shouldn't miss key moments | Proposed (owner to confirm) |

---

## 9. Open Questions

Q-1 to Q-6 were answered on 2026-11-23; see D-010 to D-015. Q-7 to Q-12 have **provisional answers** built into the pilot (marked Proposed in the Decision Log); the owner should confirm or change them.

| # | Question | Raised by | Notes |
|---|---|---|---|
| Q-7 | What is a "branch" for the Charisma stat? Is it the employee's department (R&D, Design, HR, …) or something else? | Claude | Provisional: the employee's role (D-026). |
| Q-8 | The Business CEO "attracts MBAs". Is MBA a new employee type, or a trait on existing types? | Claude | Provisional: business-side roles (D-026). |
| Q-9 | Which employees does the Marketing CEO attract? | Claude | Provisional: Sales Experts (D-026). |
| Q-10 | How big are "major" and "minor" boosts? | Claude | Provisional: +25% / +10% (D-020). |
| Q-11 | How many rival companies are there, and do new rivals appear over time? | Claude | Provisional: three fixed rivals (D-030). |
| Q-12 | Does the 1975 timeline follow real-world technology history or a looser, game-paced version? | Claude | Provisional: game-paced, gated by year (D-025). |
| Q-13 | Is the difficulty right? A competent player is comfortably profitable early; pressure comes mainly from the board's rising targets after ~1990. | Claude | Needs owner playtesting. |
| Q-14 | Is there a win condition or end year (e.g. 2030), or does the game run forever? | Claude | Pilot: no end (D-032). |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-11-23 | Claude | Created README with the owner's game design spec, tech stack, architecture, Steam-readiness rules, UI/UX plan, roadmap, decision log, open questions and collaboration protocol. |
| 2026-11-23 | Claude | Added `AGENTS.md`, which points every AI agent to this README and its collaboration protocol. |
| 2026-11-23 | Claude | Recorded the owner's answers to Q-1 to Q-6 as D-010 to D-015. Added CEO archetypes (§2.2.1), employee stats (§2.5), the rented-fabs-only rule (§2.3) and Setting and Competition (§2.10). Updated the time model (§4.2) and speed shortcuts (§5). D-007 marked superseded. Added follow-up questions Q-7 to Q-12. |
| 2026-11-23 | Claude | **Built Phase 1 (First Slice).** Project setup (Vite, React, TypeScript, Zustand, idb-keyval, Vitest); sim core (types, calendar, seeded RNG, new game, weekly tick); CEO archetype data; platform adapters (IndexedDB saves, localStorage settings, logged achievements, file download); versioned save format with validation; screens: Main Menu, New Game, Load Game (load/export/delete/import), Settings, Dashboard (top bar, sidebar, placeholders, event log); continuous clock with Space and 1–3 shortcuts; autosave; 17 unit tests. Added Getting Started, code map (§4.1.1), visual style rules (§6.2) and decisions D-016 to D-021. Tested in Chromium: new game → run at 3× → save → quit → load restores the same date, with no console errors. Added rules 8–11 to `AGENTS.md` (checks before commit, style rules, seeded RNG only, save migrations). |
| 2026-11-23 | Claude | Added GitHub Pages hosting (D-022): `.github/workflows/deploy-pages.yml` checks every push and deploys the default branch. Added the play link and a Deployment section under Getting Started; updated the pilot hosting row in §3. Owner still needs to set Settings → Pages → Source to "GitHub Actions" once. |
| 2026-11-23 | Owner, Claude | Owner set Pages source to GitHub Actions; Claude re-ran the deploy. The pilot is live at https://pablosarkar.github.io/Silicon-Empire/. README Deployment section updated to match. |
| 2026-11-25 | Claude | **Built the playable pilot (Phases 2 and 3).** New sim systems: chip model, research tree (86 tiers, 1975–2023), employees and recruiting, foundries, market with three segments and three rivals, analyst reviews, reputation, contracts, investors and board reviews, bank loans and credit score, share price, achievements, game over. New screens for all dashboard sections plus Overview (getting-started checklist) and Market; sidebar badges; pause on important events. Save version 2 with v1 migration. 36 tests including 25-year bot runs per CEO type. Played through in Chromium: hire, design, produce, launch, sell, bid, loan, save/load and the first year-end review, with no console errors. Added §2.11 (gameplay as built), updated code map, data flow, roadmap, D-023 to D-035, provisional answers to Q-7–Q-12 and new questions Q-13–Q-14. Removed a duplicated table header in §9. |
