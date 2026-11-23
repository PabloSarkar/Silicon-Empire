import { useState } from "react";
import { getArchetype } from "../../data/archetypes";
import { formatDate } from "../../sim/calendar";
import type { GameState } from "../../sim/types";
import { LogoMark } from "../components/LogoMark";
import { formatMoney } from "../format";
import { useStore, type Speed } from "../store";
import { useClockShortcuts, useGameClock } from "../useGameClock";

type SectionId =
  | "overview"
  | "newHardware"
  | "research"
  | "employees"
  | "foundry"
  | "contracts"
  | "products"
  | "investors"
  | "bank";

interface Section {
  id: SectionId;
  label: string;
  /** Roadmap phase in which the section gets built (README §7). */
  phase?: number;
  /** Planned contents, from the spec (README §2). */
  planned?: string[];
}

// Sidebar order follows the Dashboard spec (README §2.3).
const SECTIONS: Section[] = [
  { id: "overview", label: "Overview" },
  {
    id: "newHardware",
    label: "New Hardware (CPU)",
    phase: 2,
    planned: ["CPU designer: clock speed, cores, process node, voltage", "Live power, thermal and cost preview"],
  },
  {
    id: "research",
    label: "Research",
    phase: 2,
    planned: ["Process Nodes", "Instruction Sets (Architecture)", "Socket and Standards", "Clock Speeds", "Power Management", "Thermal Management"],
  },
  {
    id: "employees",
    label: "Employees / Recruiting",
    phase: 2,
    planned: ["Hire Researchers, Engineers, Designers, HR, Negotiators, Sales Experts, Tax Specialists", "Stats: Engineering, Design, Production, Research, Marketing, Finance, Business, Charisma"],
  },
  {
    id: "foundry",
    label: "Foundry / Fab Contracts",
    phase: 2,
    planned: ["Rent production capacity from third-party fabs (D-013)"],
  },
  {
    id: "contracts",
    label: "Contracts",
    phase: 3,
    planned: ["Offers with power, thermal, speed, timeline and price demands", "Reputation for completing or failing contracts"],
  },
  {
    id: "products",
    label: "Products",
    phase: 2,
    planned: ["All previous hardware", "Number sold and profit", "Analyst reviews", "Chip spec inspection"],
  },
  {
    id: "investors",
    label: "Investors",
    phase: 3,
    planned: ["Board with a yearly profit expectation", "Reward for beating it; goodwill loss for missing it"],
  },
  {
    id: "bank",
    label: "Bank",
    phase: 3,
    planned: ["Loans", "Finances: profit, share price, shareholders", "Credit score"],
  },
];

const SPEEDS: Speed[] = [1, 2, 3];

export function Dashboard() {
  useGameClock();
  useClockShortcuts();

  const game = useStore((s) => s.game);
  const [active, setActive] = useState<SectionId>("overview");
  if (!game) return null;

  const section = SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="dashboard">
      <TopBar game={game} />
      <nav className="sidebar" aria-label="Dashboard sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={s.id === active ? "active" : ""}
            aria-current={s.id === active ? "page" : undefined}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <main className="main-panel">
        <h2>{section.label}</h2>
        {active === "overview" ? <Overview game={game} /> : <Placeholder section={section} />}
      </main>
      <EventLog game={game} />
    </div>
  );
}

function TopBar({ game }: { game: GameState }) {
  const paused = useStore((s) => s.paused);
  const speed = useStore((s) => s.speed);
  const status = useStore((s) => s.status);
  const lastSavedWeek = useStore((s) => s.lastSavedWeek);
  const { setSpeed, togglePause, saveNow, openSettings, quitToMenu } = useStore.getState();

  function onQuit() {
    const unsaved = lastSavedWeek !== game.week;
    if (unsaved && !window.confirm("Quit to the main menu? Progress since your last save will be lost.")) {
      return;
    }
    quitToMenu();
  }

  return (
    <header className="top-bar">
      <div className="company">
        <LogoMark logo={game.company.logo} size={28} />
        <strong>{game.company.name}</strong>
      </div>
      <dl className="stats">
        <div>
          <dt>Date</dt>
          <dd className="num">{formatDate(game.week)}</dd>
        </div>
        <div>
          <dt>Cash</dt>
          <dd className="num">{formatMoney(game.company.cash)}</dd>
        </div>
        <div title="Available once the Bank is built (Phase 3)">
          <dt>Share price</dt>
          <dd className="num muted">n/a</dd>
        </div>
        <div title="Available once Investors are built (Phase 3)">
          <dt>Investor goodwill</dt>
          <dd className="num muted">n/a</dd>
        </div>
      </dl>
      <div className="speed-controls" role="group" aria-label="Game speed">
        <button className={paused ? "active" : ""} onClick={togglePause} title="Space">
          {paused ? "Paused" : "Pause"}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={!paused && speed === s ? "active" : ""}
            onClick={() => setSpeed(s)}
            title={`Key ${s}`}
          >
            {s}×
          </button>
        ))}
      </div>
      <div className="game-menu">
        {status && <span className="muted status">{status}</span>}
        <button onClick={() => void saveNow()}>Save</button>
        <button onClick={openSettings}>Settings</button>
        <button onClick={onQuit}>Main Menu</button>
      </div>
    </header>
  );
}

function Overview({ game }: { game: GameState }) {
  const archetype = getArchetype(game.ceo.archetype);
  return (
    <div className="overview">
      <table className="data-table compact key-value">
        <tbody>
          <tr>
            <th>Company</th>
            <td>{game.company.name}</td>
          </tr>
          <tr>
            <th>CEO</th>
            <td>{game.ceo.name}</td>
          </tr>
          <tr>
            <th>CEO archetype</th>
            <td>{archetype.name}</td>
          </tr>
          <tr>
            <th>Founded</th>
            <td className="num">{formatDate(0)}</td>
          </tr>
          <tr>
            <th>Weeks in business</th>
            <td className="num">{game.week}</td>
          </tr>
          <tr>
            <th>Cash</th>
            <td className="num">{formatMoney(game.company.cash)}</td>
          </tr>
        </tbody>
      </table>
      <h3>CEO effects</h3>
      <ul>
        {archetype.effects.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      <p className="muted">Attracts: {archetype.attracts}</p>
    </div>
  );
}

function Placeholder({ section }: { section: Section }) {
  return (
    <div>
      <p className="muted">Not built yet. Planned for Phase {section.phase} (see README §7).</p>
      {section.planned && (
        <>
          <h3>Planned</h3>
          <ul>
            {section.planned.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function EventLog({ game }: { game: GameState }) {
  const recent = game.events.slice(-50).reverse();
  return (
    <aside className="event-log" aria-label="Event log">
      <h3>Event log</h3>
      <ol>
        {recent.map((e, i) => (
          <li key={`${e.week}-${i}`}>
            <span className="num muted">{formatDate(e.week)}</span> {e.message}
          </li>
        ))}
      </ol>
    </aside>
  );
}
