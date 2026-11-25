import { useState } from "react";
import { BASE_TAX_RATE } from "../../../data/balance";
import { FABS, getFab } from "../../../data/market";
import { RESEARCH_NODES } from "../../../data/research";
import { orderProduction } from "../../../sim/actions";
import { formatDate } from "../../../sim/calendar";
import { teamOutput } from "../../../sim/employees";
import { fabNewestYear, fabQuote, fabSupportsNode } from "../../../sim/production";
import { KeyValue, Section } from "../../components/Widgets";
import { formatMoney, formatMoneyCents, formatNumber, formatPercent } from "../../format";
import { useGame, useStore } from "../../store";

function newestProcessName(year: number): string {
  const nodes = RESEARCH_NODES.filter((n) => n.kind === "process" && n.year <= year);
  return nodes[nodes.length - 1]?.name ?? "—";
}

export function Foundry({ initialProductId }: { initialProductId?: string }) {
  const game = useGame();
  const dispatch = useStore((s) => s.dispatch);
  const out = teamOutput(game, BASE_TAX_RATE);
  const buildable = game.products.filter((p) => p.status === "ready" || p.status === "onSale");

  const [productId, setProductId] = useState(initialProductId ?? buildable[0]?.id ?? "");
  const product = buildable.find((p) => p.id === productId) ?? buildable[0];
  const firstFab = product ? FABS.find((f) => fabSupportsNode(f, product.spec.nodeId, game.week)) : undefined;
  const [fabId, setFabId] = useState(firstFab?.id ?? FABS[0].id);
  const [quantity, setQuantity] = useState(2000);

  const quote = product ? fabQuote(game, product, fabId, quantity, out.production) : null;

  return (
    <div>
      <Section title="Foundry partners">
        <p className="muted">
          You don't own a fab; production is rented (D-013). Each foundry offers newer processes some years after they appear.
        </p>
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Foundry</th>
              <th>Newest process</th>
              <th>Price</th>
              <th>Defects</th>
              <th>Lead time</th>
              <th>Minimum order</th>
            </tr>
          </thead>
          <tbody>
            {FABS.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{newestProcessName(fabNewestYear(f, game.week))}</td>
                <td className="num">×{f.priceMult.toFixed(2)}</td>
                <td className="num">{formatPercent(f.defectRate)}</td>
                <td className="num">{f.leadWeeks} weeks</td>
                <td className="num">{formatNumber(f.minOrder)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          Your production quality ({formatPercent(Math.min(1, out.production))}) lowers defects and shortens lead times. Hire Engineers to improve it.
        </p>
      </Section>

      <Section title="New order">
        {!product ? (
          <p className="muted">No finished designs yet. Design a chip under New Hardware first.</p>
        ) : (
          <>
            <div className="form-grid">
              <label htmlFor="f-product">Chip</label>
              <select id="f-product" value={product.id} onChange={(e) => setProductId(e.target.value)}>
                {buildable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.spec.name} ({p.status === "onSale" ? "on sale" : "not launched"}, {formatNumber(p.inventory)} in stock)
                  </option>
                ))}
              </select>

              <label htmlFor="f-fab">Foundry</label>
              <select id="f-fab" value={fabId} onChange={(e) => setFabId(e.target.value)}>
                {FABS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {fabSupportsNode(f, product.spec.nodeId, game.week) ? "" : " (doesn't offer this process)"}
                  </option>
                ))}
              </select>

              <label htmlFor="f-qty">Quantity</label>
              <div>
                <input
                  id="f-qty"
                  type="number"
                  className="mid-num"
                  min={0}
                  step={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                />
                <span className="hint"> Last week this chip sold {formatNumber(product.lastWeekSales)}.</span>
              </div>
            </div>
            {quote && (
              <KeyValue
                rows={[
                  ["Cost per chip", formatMoneyCents(quote.unitCost)],
                  ["Total cost", formatMoney(quote.totalCost)],
                  ["Defect rate", formatPercent(quote.defectRate, 1)],
                  ["Working chips delivered", formatNumber(quote.goodUnits)],
                  ["Delivery", `${quote.leadWeeks} weeks (${formatDate(game.week + quote.leadWeeks)})`],
                ]}
              />
            )}
            {quote && quote.problems.length > 0 && (
              <div className="error-box">
                {quote.problems.map((p) => (
                  <div key={p}>{p}</div>
                ))}
              </div>
            )}
            <p>
              <button
                className="primary"
                disabled={!quote || quote.problems.length > 0}
                onClick={() => dispatch((g) => orderProduction(g, product.id, fabId, quantity))}
              >
                Place order
              </button>
            </p>
          </>
        )}
      </Section>

      <Section title="Orders in production">
        {game.fabOrders.length === 0 ? (
          <p className="muted">No orders in production.</p>
        ) : (
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Chip</th>
                <th>Foundry</th>
                <th>Ordered</th>
                <th>Working chips</th>
                <th>Cost</th>
                <th>Arrives</th>
              </tr>
            </thead>
            <tbody>
              {game.fabOrders.map((o) => (
                <tr key={o.id}>
                  <td>{game.products.find((p) => p.id === o.productId)?.spec.name ?? "?"}</td>
                  <td>{getFab(o.fabId).name}</td>
                  <td className="num">{formatNumber(o.quantity)}</td>
                  <td className="num">{formatNumber(o.goodUnits)}</td>
                  <td className="num">{formatMoney(o.cost)}</td>
                  <td className="num">
                    {formatDate(o.deliveryWeek)} ({o.deliveryWeek - game.week} wk)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
