import { useState } from "react";
import { formatDate } from "../../sim/calendar";
import type { GameState } from "../../sim/types";
import { LogoMark } from "../components/LogoMark";
import { formatMoney, formatMoneyCents } from "../format";
import { useStore, type Speed } from "../store";
import { useClockShortcuts, useGameClock } from "../useGameClock";
import { Bank } from "./game/Bank";
import { Contracts } from "./game/Contracts";
import { Designer } from "./game/Designer";
import { Employees } from "./game/Employees";
import { Foundry } from "./game/Foundry";
import { Investors } from "./game/Investors";
import { Market } from "./game/Market";
import { Overview } from "./game/Overview";
import { Products } from "./game/Products";
import { Research } from "./game/Research";

export type SectionId =
  | "overview"
  | "newHardware"
  | "research"
  | "employees"
  | "foundry"
  | "contracts"
  | "products"
  | "market"
  | "investors"
  | "bank";

// Sidebar order follows the Dashboard spec (README §2.3); Overview and
// Market are additions (D-027).
const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "newHardware", label: "New Hardware (CPU)" },
  { id: "research", label: "Research" },
  { id: "employees", label: "Employees / Recruiting" },
  { id: "foundry", label: "Foundry / Fab Contracts" },
  { id: "contracts", label: "Contracts" },
  { id: "products", label: "Products" },
  { id: "market", label: "Market" },
  { id: "investors", label: "Investors" },
  { id: "bank", label: "Bank" },
];

const SPEEDS: Speed[] = [1, 2, 3];

/** Short count shown next to a sidebar item when something needs attention. */
function sectionBadge(game: GameState, id: SectionId): string | null {
  if (id === "contracts") {
    const open = game.contracts.filter((c) => c.status === "open").length;
    const active = game.contracts.filter((c) => c.status === "active").length;
    if (open + active === 0) return null;
    return active > 0 ? `${open} new, ${active} to deliver` : `${open} new`;
  }
  if (id === "products") {
    const soldOut = game.products.filter((p) => p.status === "onSale" && p.inventory === 0).length;
    return soldOut > 0 ? `${soldOut} sold out` : null;
  }
  if (id === "research" && !game.research.current) return "idle";
  if (id === "newHardware" && game.products.some((p) => p.status === "ready")) return "ready";
  return null;
}

export function Dashboard() {
  useGameClock();
  useClockShortcuts();

  const game = useStore((s) => s.game);
  const actionError = useStore((s) => s.actionError);
  const clearActionError = useStore((s) => s.clearActionError);
  const [active, setActive] = useState<SectionId>("overview");
  const [foundryProduct, setFoundryProduct] = useState<string | undefined>(undefined);
  if (!game) return null;

  const section = SECTIONS.find((s) => s.id === active)!;

  function navigate(id: SectionId) {
    clearActionError();
    if (id !== "foundry") setFoundryProduct(undefined);
    setActive(id);
  }

  function orderFor(productId: string) {
    clearActionError();
    setFoundryProduct(productId);
    setActive("foundry");
  }

  return (
    <div className="dashboard">
      <TopBar game={game} />
      <nav className="sidebar" aria-label="Dashboard sections">
        {SECTIONS.map((s) => {
          const badge = sectionBadge(game, s.id);
          return (
            <button
              key={s.id}
              className={s.id === active ? "active" : ""}
              aria-current={s.id === active ? "page" : undefined}
              onClick={() => navigate(s.id)}
            >
              {s.label}
              {badge && <span className="badge">{badge}</span>}
            </button>
          );
        })}
      </nav>
      <main className="main-panel">
        {game.gameOver && <GameOverPanel game={game} />}
        <h2>{section.label}</h2>
        {actionError && (
          <div className="error-box action-error" role="alert">
            {actionError}{" "}
            <button className="link" onClick={clearActionError}>
              Dismiss
            </button>
          </div>
        )}
        {active === "overview" && <Overview onNavigate={navigate} />}
        {active === "newHardware" && <Designer />}
        {active === "research" && <Research />}
        {active === "employees" && <Employees />}
        {active === "foundry" && <Foundry key={foundryProduct ?? "none"} initialProductId={foundryProduct} />}
        {active === "contracts" && <Contracts />}
        {active === "products" && <Products onOrder={orderFor} />}
        {active === "market" && <Market />}
        {active === "investors" && <Investors />}
        {active === "bank" && <Bank />}
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
    const unsaved = lastSavedWeek !== game.week && !game.gameOver;
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
          <dd className={`num ${game.company.cash < 0 ? "bad" : ""}`}>{formatMoney(game.company.cash)}</dd>
        </div>
        <div>
          <dt>Share price</dt>
          <dd className="num">{formatMoneyCents(game.sharePrice)}</dd>
        </div>
        <div>
          <dt>Investor goodwill</dt>
          <dd className={`num ${game.investors.goodwill < 25 ? "bad" : ""}`}>{Math.round(game.investors.goodwill)}</dd>
        </div>
        <div>
          <dt>Reputation</dt>
          <dd className="num">{Math.round(game.company.reputation)}</dd>
        </div>
      </dl>
      <div className="speed-controls" role="group" aria-label="Game speed">
        <button className={paused ? "active" : ""} onClick={togglePause} title="Space" disabled={Boolean(game.gameOver)}>
          {paused ? "Paused" : "Pause"}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={!paused && speed === s ? "active" : ""}
            onClick={() => setSpeed(s)}
            title={`Key ${s}`}
            disabled={Boolean(game.gameOver)}
          >
            {s}×
          </button>
        ))}
      </div>
      <div className="game-menu">
        {status && <span className="muted status">{status}</span>}
        <button onClick={() => void saveNow()} disabled={Boolean(game.gameOver)}>
          Save
        </button>
        <button onClick={openSettings}>Settings</button>
        <button onClick={onQuit}>Main Menu</button>
      </div>
    </header>
  );
}

function GameOverPanel({ game }: { game: GameState }) {
  const quitToMenu = useStore((s) => s.quitToMenu);
  const best = game.years.reduce((m, y) => Math.max(m, y.netProfit), 0);
  return (
    <div className="game-over">
      <h2>Game over</h2>
      <p>{game.gameOver!.reason}</p>
      <p>
        {game.company.name} lasted until {formatDate(game.gameOver!.week)}, released {game.products.filter((p) => p.launchedWeek !== null).length}{" "}
        chips, and its best year made {formatMoney(best)} in net profit.
      </p>
      <button className="primary" onClick={quitToMenu}>
        Back to main menu
      </button>
    </div>
  );
}

function EventLog({ game }: { game: GameState }) {
  const recent = game.events.slice(-60).reverse();
  return (
    <aside className="event-log" aria-label="Event log">
      <h3>Event log</h3>
      <ol>
        {recent.map((e, i) => (
          <li key={`${e.week}-${i}`} className={e.important ? "important" : ""}>
            <span className="num muted">{formatDate(e.week)}</span> {e.message}
          </li>
        ))}
      </ol>
    </aside>
  );
}
