import { RIVALS, SEGMENTS, marketUnitsPerWeek } from "../../../data/market";
import { formatDate } from "../../../sim/calendar";
import { marketShare } from "../../../sim/market";
import { Section } from "../../components/Widgets";
import { formatMoney, formatNumber, formatPercent, formatPerf } from "../../format";
import { useGame } from "../../store";

export function Market() {
  const game = useGame();
  const shares = marketShare(game);
  const sold = shares.reduce((sum, r) => sum + r.units, 0);
  const rivalName = (id: string) => RIVALS.find((r) => r.id === id)!.name;
  const products = [...game.rivalProducts].sort((a, b) => b.perf - a.perf);

  return (
    <div>
      <Section title="Market size">
        <p>
          Buyers want about <strong className="num">{formatNumber(marketUnitsPerWeek(game.week))}</strong> CPUs per week. Not every buyer buys:
          chips that are too slow or too expensive lose sales to "not buying".
        </p>
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Segment</th>
              <th>Share of buyers</th>
              <th>Typical price</th>
              <th>Buyers care about</th>
            </tr>
          </thead>
          <tbody>
            {SEGMENTS.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="num">{formatPercent(s.share)}</td>
                <td className="num">{formatMoney(s.refPrice)}</td>
                <td>{s.perfWeight > s.priceWeight ? "Performance first" : s.priceWeight > 2 ? "Price first" : "Balance of price and performance"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Market share (last week)">
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Company</th>
              <th>Chips sold</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {shares.map((r) => (
              <tr key={r.name} className={r.player ? "row-player" : ""}>
                <td>{r.name}</td>
                <td className="num">{formatNumber(r.units)}</td>
                <td className="num">{sold > 0 ? formatPercent(r.units / sold) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Rival chips on sale">
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Company</th>
              <th>Chip</th>
              <th>Segment</th>
              <th>Performance</th>
              <th>Power</th>
              <th>Price</th>
              <th>Launched</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{rivalName(p.rivalId)}</td>
                <td>{p.name}</td>
                <td>{SEGMENTS.find((s) => s.id === p.segment)!.name}</td>
                <td className="num">{formatPerf(p.perf)}</td>
                <td className="num">{p.powerW.toFixed(1)} W</td>
                <td className="num">{formatMoney(p.price)}</td>
                <td className="num">{formatDate(p.launchedWeek)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
