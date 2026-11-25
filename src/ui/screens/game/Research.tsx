import { useState } from "react";
import { BASE_TAX_RATE } from "../../../data/balance";
import {
  CATEGORIES,
  getResearchNode,
  nodesInCategory,
  researchCashCost,
  researchPointCost,
  type ResearchCategory,
  type ResearchNode,
} from "../../../data/research";
import { startResearch, stopResearch } from "../../../sim/actions";
import { teamOutput } from "../../../sim/employees";
import { researchStatus } from "../../../sim/research";
import { ProgressBar, Section } from "../../components/Widgets";
import { formatClock, formatMoney, formatNumber } from "../../format";
import { useGame, useStore } from "../../store";

/** One-line summary of what a tier gives. */
function effectText(n: ResearchNode): string {
  switch (n.kind) {
    case "process":
      return `${n.density} M transistors/mm²`;
    case "width":
      return `${n.ipc} instructions per clock`;
    case "feature":
      return `+${Math.round((n.ipcMult - 1) * 100)}% per clock`;
    case "cores":
      return `Up to ${n.maxCores} cores`;
    case "socket":
      return `${n.maxPowerW} W, +${Math.round((n.bandwidth - 1) * 100)}% bandwidth`;
    case "clock":
      return `Up to ${formatClock(n.maxClockMHz)}`;
    case "power":
      return `${Math.round((1 - n.powerMult) * 100)}% less power`;
    case "thermal":
      return `${n.thermalResistance} °C per watt`;
  }
}

const STATUS_TEXT = {
  done: "Done",
  current: "Researching",
  available: "Available",
  lockedYear: "",
  lockedPrereq: "Needs previous tier",
} as const;

export function Research() {
  const game = useGame();
  const dispatch = useStore((s) => s.dispatch);
  const [category, setCategory] = useState<ResearchCategory>("process");
  const out = teamOutput(game, BASE_TAX_RATE);
  const current = game.research.current ? getResearchNode(game.research.current) : null;

  return (
    <div>
      <Section title="Current research">
        {current ? (
          <>
            <p>
              <strong>{current.name}</strong> ({CATEGORIES.find((c) => c.id === current.category)!.name}):{" "}
              {formatNumber(game.research.progress[current.id] ?? 0)} of {formatNumber(researchPointCost(current))} points. About{" "}
              {Math.ceil((researchPointCost(current) - (game.research.progress[current.id] ?? 0)) / Math.max(0.1, out.researchPerWeek))}{" "}
              weeks left.
            </p>
            <ProgressBar value={game.research.progress[current.id] ?? 0} max={researchPointCost(current)} />
            <p>
              <button onClick={() => dispatch(stopResearch)}>Pause research</button>{" "}
              <span className="hint">Progress is kept; you can switch to another tier and come back.</span>
            </p>
          </>
        ) : (
          <p className="muted">Nothing is being researched. Pick an available tier below.</p>
        )}
        <p className="muted">
          Your team produces {out.researchPerWeek.toFixed(1)} research points per week. Hire Researchers and Engineers to go faster.
          Cash is paid once, when a tier is first started.
        </p>
      </Section>

      <div className="tabs" role="tablist">
        {CATEGORIES.map((c) => {
          const done = nodesInCategory(c.id).filter((n) => game.research.completed.includes(n.id)).length;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={category === c.id}
              className={category === c.id ? "active" : ""}
              onClick={() => setCategory(c.id)}
            >
              {c.name} <span className="muted">({done}/{nodesInCategory(c.id).length})</span>
            </button>
          );
        })}
      </div>

      <table className="data-table compact">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Effect</th>
            <th>Year</th>
            <th>Points</th>
            <th>Cash</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {nodesInCategory(category).map((n) => {
            const status = researchStatus(game, n.id);
            const started = n.id in game.research.progress;
            return (
              <tr key={n.id} className={status === "done" ? "row-done" : ""}>
                <td title={n.description}>{n.name}</td>
                <td className="muted">{effectText(n)}</td>
                <td className="num">{n.year}</td>
                <td className="num">
                  {started ? `${formatNumber(game.research.progress[n.id])} / ` : ""}
                  {formatNumber(researchPointCost(n))}
                </td>
                <td className="num">{started || status === "done" ? "Paid" : formatMoney(researchCashCost(n))}</td>
                <td>
                  {status === "available" ? (
                    <button onClick={() => dispatch((g) => startResearch(g, n.id))}>{started ? "Resume" : "Research"}</button>
                  ) : status === "lockedYear" ? (
                    <span className="muted">Available in {n.year}</span>
                  ) : (
                    <span className={status === "done" ? "ok" : "muted"}>{STATUS_TEXT[status]}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
