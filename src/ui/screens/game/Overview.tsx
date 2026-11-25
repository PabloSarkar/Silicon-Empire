import { getArchetype } from "../../../data/archetypes";
import { BASE_TAX_RATE } from "../../../data/balance";
import { getResearchNode } from "../../../data/research";
import { calendarYear, formatDate } from "../../../sim/calendar";
import { teamOutput } from "../../../sim/employees";
import { ledgerCosts, ledgerRevenue } from "../../../sim/finance";
import { marketShare } from "../../../sim/market";
import type { GameState } from "../../../sim/types";
import { KeyValue, Section, TargetProgress } from "../../components/Widgets";
import { formatMoney, formatPercent } from "../../format";
import { useGame } from "../../store";
import type { SectionId } from "../Dashboard";

interface Step {
  done: boolean;
  text: string;
  section: SectionId;
}

function steps(game: GameState): Step[] {
  const started = game.products.length > 0;
  return [
    { done: game.employees.length > 0, text: "Hire your first employees (Designers and Researchers help most early on).", section: "employees" },
    { done: game.research.current !== null || game.research.completed.length > 6, text: "Start a research project.", section: "research" },
    { done: started, text: "Design your first CPU.", section: "newHardware" },
    { done: game.products.some((p) => p.status !== "development"), text: "Wait for the design to finish (watch the event log).", section: "newHardware" },
    { done: game.fabOrders.length > 0 || game.products.some((p) => p.inventory > 0 || p.unitsSold > 0), text: "Order production from a foundry.", section: "foundry" },
    { done: game.products.some((p) => p.launchedWeek !== null), text: "Launch the chip at a price.", section: "products" },
    { done: game.contracts.some((c) => c.status !== "open"), text: "Bid on a contract.", section: "contracts" },
  ];
}

export function Overview({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  const game = useGame();
  const archetype = getArchetype(game.ceo.archetype);
  const out = teamOutput(game, BASE_TAX_RATE);
  const ytd = ledgerRevenue(game.ledger) - ledgerCosts(game.ledger);
  const target = game.investors.expectation;
  const shares = marketShare(game);
  const sold = shares.reduce((s, r) => s + r.units, 0);
  const developing = game.products.find((p) => p.status === "development");
  const todo = steps(game);
  const showGuide = todo.some((s) => !s.done) && game.week < 260;

  return (
    <div>
      {showGuide && (
        <Section title="Getting started">
          <ol className="checklist">
            {todo.map((s) => (
              <li key={s.text} className={s.done ? "done" : ""}>
                {s.done ? "[done] " : ""}
                {s.text}{" "}
                {!s.done && (
                  <button className="link" onClick={() => onNavigate(s.section)}>
                    Go
                  </button>
                )}
              </li>
            ))}
          </ol>
          <p className="muted">Space pauses, 1–3 set the speed. The game pauses itself when something important happens (Settings).</p>
        </Section>
      )}

      <div className="two-col">
        <Section title="Company">
          <KeyValue
            rows={[
              ["CEO", `${game.ceo.name} (${archetype.name})`],
              ["Founded", formatDate(0)],
              ["Reputation", `${Math.round(game.company.reputation)} / 100`],
              ["Employees", game.employees.length],
              ["Market share", sold > 0 ? formatPercent(shares[0].units / sold) : "—"],
              ["Credit score", Math.round(game.bank.creditScore)],
            ]}
          />
        </Section>
        <Section title="Now">
          <KeyValue
            rows={[
              ["Research", game.research.current ? getResearchNode(game.research.current).name : <span className="muted">Idle</span>],
              ["Design", developing ? `${developing.spec.name} (${formatPercent(developing.designProgress / developing.stats.designPoints)})` : <span className="muted">Idle</span>],
              ["Chips on sale", game.products.filter((p) => p.status === "onSale").length],
              ["Production orders", game.fabOrders.length],
              ["Contracts to deliver", game.contracts.filter((c) => c.status === "active").length],
              ["Research / design per week", `${out.researchPerWeek.toFixed(1)} / ${out.designPerWeek.toFixed(1)} points`],
            ]}
          />
        </Section>
      </div>

      <Section title={`Board target for ${calendarYear(game.week)}`}>
        <p>
          Profit so far: <span className="num">{formatMoney(ytd)}</span> before tax. Target: <span className="num">{formatMoney(target)}</span> net
          profit. Goodwill {Math.round(game.investors.goodwill)} / 100.
        </p>
        <TargetProgress profit={ytd} target={target} format={formatMoney} />
      </Section>

      <Section title="CEO effects">
        <ul>
          {archetype.effects.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
