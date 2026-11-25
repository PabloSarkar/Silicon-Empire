import { useState } from "react";
import { BASE_TAX_RATE } from "../../../data/balance";
import { CLIENTS, getClient } from "../../../data/market";
import { bidContract, deliverContract } from "../../../sim/actions";
import { formatDate } from "../../../sim/calendar";
import { meetsContract, winChance } from "../../../sim/contracts";
import { teamOutput } from "../../../sim/employees";
import type { Contract, GameState, Product } from "../../../sim/types";
import { Check, Section } from "../../components/Widgets";
import { formatMoney, formatNumber, formatPercent, formatPerf } from "../../format";
import { useGame, useStore } from "../../store";

function candidates(game: GameState): Product[] {
  return game.products.filter((p) => p.status !== "development");
}

/** The finished chip that meets the most requirements (ties: most stock). */
function bestFit(game: GameState, c: Contract): Product | null {
  let best: Product | null = null;
  let bestScore = -1;
  for (const p of candidates(game)) {
    const m = meetsContract(p.stats, c);
    const score = Number(m.perf) + Number(m.power) + Number(m.temp) + (p.inventory >= c.units ? 0.5 : 0);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

function Requirements({ c, product }: { c: Contract; product: Product | null }) {
  const m = product ? meetsContract(product.stats, c) : null;
  return (
    <>
      <td>
        <span className="num">≥ {formatPerf(c.minPerf)}</span> {m && <Check ok={m.perf} />}
      </td>
      <td>
        <span className="num">≤ {c.maxPowerW} W</span> {m && <Check ok={m.power} />}
      </td>
      <td>
        <span className="num">≤ {c.maxTempC} °C</span> {m && <Check ok={m.temp} />}
      </td>
    </>
  );
}

function ActiveRow({ c, game }: { c: Contract; game: GameState }) {
  const dispatch = useStore((s) => s.dispatch);
  const fits = candidates(game).filter((p) => meetsContract(p.stats, c).all);
  const [productId, setProductId] = useState(fits[0]?.id ?? "");
  const chosen = fits.find((p) => p.id === productId) ?? fits[0];
  return (
    <tr>
      <td>{getClient(c.clientId).name}</td>
      <td className="num">{formatNumber(c.units)}</td>
      <Requirements c={c} product={chosen ?? bestFit(game, c)} />
      <td className="num">{formatMoney(c.units * c.pricePerUnit)}</td>
      <td className={`num ${c.deadlineWeek !== null && c.deadlineWeek - game.week <= 4 ? "bad" : ""}`}>
        {c.deadlineWeek !== null && `${formatDate(c.deadlineWeek)} (${c.deadlineWeek - game.week} wk)`}
      </td>
      <td>
        {fits.length === 0 ? (
          <span className="muted">No finished chip meets the requirements. Design one.</span>
        ) : (
          <span className="inline-actions">
            <select value={chosen.id} onChange={(e) => setProductId(e.target.value)} aria-label="Chip to deliver">
              {fits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.spec.name} ({formatNumber(p.inventory)} in stock)
                </option>
              ))}
            </select>
            <button className="primary" disabled={chosen.inventory < c.units} onClick={() => dispatch((g) => deliverContract(g, c.id, chosen.id))}>
              Deliver
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

export function Contracts() {
  const game = useGame();
  const dispatch = useStore((s) => s.dispatch);
  const out = teamOutput(game, BASE_TAX_RATE);
  const open = game.contracts.filter((c) => c.status === "open");
  const bidding = game.contracts.filter((c) => c.status === "bidding");
  const active = game.contracts.filter((c) => c.status === "active");
  const history = game.contracts.filter((c) => ["completed", "failed", "lost"].includes(c.status)).reverse();

  return (
    <div>
      <p className="muted">
        Clients order chips that meet their requirements. Bid on an offer; if you win, deliver the chips from stock before the deadline. Missing
        the deadline costs a penalty and reputation. Requirement checks use your best-matching finished chip.
      </p>

      <Section title="Offers">
        {open.length === 0 ? (
          <p className="muted">No offers right now. New ones arrive every few weeks.</p>
        ) : (
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Client</th>
                <th>Chips</th>
                <th>Performance</th>
                <th>Power</th>
                <th>Temperature</th>
                <th>Pays</th>
                <th>Deliver within</th>
                <th>Offer ends</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {open.map((c) => (
                <tr key={c.id}>
                  <td title={getClient(c.clientId).industry}>{getClient(c.clientId).name}</td>
                  <td className="num">{formatNumber(c.units)}</td>
                  <Requirements c={c} product={bestFit(game, c)} />
                  <td className="num">
                    {formatMoney(c.units * c.pricePerUnit)}
                    <div className="muted">{formatMoney(c.pricePerUnit)}/chip</div>
                  </td>
                  <td className="num">{c.durationWeeks} weeks</td>
                  <td className="num">{c.expiresWeek - game.week} wk</td>
                  <td>
                    <button onClick={() => dispatch((g) => bidContract(g, c.id))}>Bid ({formatPercent(winChance(game, c, out.negotiation))})</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {bidding.length > 0 && (
        <Section title="Bids waiting for an answer">
          <ul>
            {bidding.map((c) => (
              <li key={c.id}>
                {getClient(c.clientId).name}: {formatNumber(c.units)} chips, {formatPercent(c.winChance ?? 0)} chance. Answer next week.
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Won contracts to deliver">
        {active.length === 0 ? (
          <p className="muted">None.</p>
        ) : (
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Client</th>
                <th>Chips</th>
                <th>Performance</th>
                <th>Power</th>
                <th>Temperature</th>
                <th>Pays</th>
                <th>Deadline</th>
                <th>Deliver</th>
              </tr>
            </thead>
            <tbody>
              {active.map((c) => (
                <ActiveRow key={c.id} c={c} game={game} />
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Client relationships">
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Client</th>
              <th>Industry</th>
              <th>Relationship</th>
            </tr>
          </thead>
          <tbody>
            {CLIENTS.map((cl) => (
              <tr key={cl.id}>
                <td>{cl.name}</td>
                <td>{cl.industry}</td>
                <td className="num">{Math.round(game.clientRelations[cl.id] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="History">
        {history.length === 0 ? (
          <p className="muted">No finished contracts yet.</p>
        ) : (
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Client</th>
                <th>Chips</th>
                <th>Result</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id}>
                  <td>{getClient(c.clientId).name}</td>
                  <td className="num">{formatNumber(c.units)}</td>
                  <td className={c.status === "completed" ? "ok" : "bad"}>
                    {c.status === "completed" ? `Delivered, paid ${formatMoney(c.paid ?? 0)}` : c.status === "failed" ? `Missed deadline, penalty ${formatMoney(c.penalty)}` : "Bid lost"}
                  </td>
                  <td className="num">{c.resolvedWeek !== null ? formatDate(c.resolvedWeek) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
