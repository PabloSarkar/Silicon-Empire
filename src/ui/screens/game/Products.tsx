import { useState } from "react";
import { SEGMENTS } from "../../../data/market";
import { getResearchNode } from "../../../data/research";
import { cancelDesign, discontinueProduct, launchProduct, setPrice } from "../../../sim/actions";
import { formatDate } from "../../../sim/calendar";
import type { Product, ProductStatus } from "../../../sim/types";
import { KeyValue, ProgressBar, Section } from "../../components/Widgets";
import {
  formatClock,
  formatMoney,
  formatMoneyCents,
  formatNumber,
  formatPercent,
  formatPerf,
  formatTransistors,
} from "../../format";
import { useGame, useStore } from "../../store";

const STATUS: Record<ProductStatus, string> = {
  development: "In development",
  ready: "Not launched",
  onSale: "On sale",
  discontinued: "Discontinued",
};

function profit(p: Product): number {
  return p.revenue - p.productionCost - p.stats.maskCost;
}

export function Products({ onOrder }: { onOrder: (productId: string) => void }) {
  const game = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const products = [...game.products].reverse();
  const selected = products.find((p) => p.id === selectedId) ?? products[0];

  if (products.length === 0) {
    return <p className="muted">No products yet. Design your first chip under New Hardware.</p>;
  }

  return (
    <div>
      <table className="data-table compact selectable">
        <thead>
          <tr>
            <th>Chip</th>
            <th>Status</th>
            <th>Price</th>
            <th>In stock</th>
            <th>Sold last week</th>
            <th>Total sold</th>
            <th>Revenue</th>
            <th>Profit</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={p.id === selected?.id ? "selected" : ""} onClick={() => setSelectedId(p.id)}>
              <td>
                <button className="link" onClick={() => setSelectedId(p.id)}>
                  {p.spec.name}
                </button>
              </td>
              <td>{STATUS[p.status]}</td>
              <td className="num">{p.status === "onSale" || p.status === "discontinued" ? formatMoney(p.price) : "—"}</td>
              <td className="num">{formatNumber(p.inventory)}</td>
              <td className="num">{formatNumber(p.lastWeekSales)}</td>
              <td className="num">{formatNumber(p.unitsSold)}</td>
              <td className="num">{formatMoney(p.revenue)}</td>
              <td className={`num ${profit(p) < 0 ? "bad" : ""}`}>{formatMoney(profit(p))}</td>
              <td className="num">{p.review ? `${p.review.score}/10` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">Profit = revenue − production orders − masks and tooling. Click a chip to inspect it.</p>
      {selected && <ProductDetail key={selected.id} p={selected} onOrder={onOrder} />}
    </div>
  );
}

function ProductDetail({ p, onOrder }: { p: Product; onOrder: (productId: string) => void }) {
  const game = useGame();
  const dispatch = useStore((s) => s.dispatch);
  const [price, setPriceInput] = useState(p.price || SEGMENTS.find((s) => s.id === "mainstream")!.refPrice);
  const pending = game.fabOrders.filter((o) => o.productId === p.id).reduce((sum, o) => sum + o.goodUnits, 0);

  return (
    <Section title={`${p.spec.name}: ${STATUS[p.status]}`}>
      <div className="two-col">
        <div>
          <h4>Specifications</h4>
          <KeyValue
            rows={[
              ["Process", getResearchNode(p.spec.nodeId).name],
              ["Architecture", getResearchNode(p.spec.widthId).name],
              ["Features", p.spec.features.length ? p.spec.features.map((f) => getResearchNode(f).name).join(", ") : "None"],
              ["Socket", getResearchNode(p.spec.socketId).name],
              ["Cores", p.spec.cores],
              ["Clock", formatClock(p.spec.clockMHz)],
              ["Performance", formatPerf(p.stats.perf)],
              ["Power", `${p.stats.powerW.toFixed(1)} W`],
              ["Temperature", `${Math.round(p.stats.tempC)} °C`],
              ["Transistors", formatTransistors(p.stats.transistorsM)],
              ["Die area", `${p.stats.dieAreaMm2.toFixed(1)} mm²`],
              ["Yield", formatPercent(p.stats.yield)],
              ["Raw cost per chip", formatMoneyCents(p.stats.rawUnitCost)],
            ]}
          />
        </div>
        <div>
          <h4>Analyst</h4>
          {p.review ? (
            <>
              <p>
                <strong className="num">{p.review.score}/10</strong>
              </p>
              <ul>
                {p.review.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Analysts review a chip when it launches.</p>
          )}

          <h4>Sales</h4>
          <KeyValue
            rows={[
              ["Designed", p.completedWeek !== null ? formatDate(p.completedWeek) : "Not yet"],
              ["Launched", p.launchedWeek !== null ? formatDate(p.launchedWeek) : "Not yet"],
              ["Units sold", formatNumber(p.unitsSold)],
              ["Of which to contracts", formatNumber(p.contractUnits)],
              ["Revenue", formatMoney(p.revenue)],
              ["Production spent", formatMoney(p.productionCost)],
              ["In stock", formatNumber(p.inventory)],
              ["Arriving from foundries", formatNumber(pending)],
            ]}
          />

          <h4>Actions</h4>
          {p.status === "development" && (
            <>
              <ProgressBar value={p.designProgress} max={p.stats.designPoints} label={`${formatPercent(p.designProgress / p.stats.designPoints)} designed`} />
              <p>
                <button onClick={() => window.confirm(`Cancel ${p.spec.name}?`) && dispatch((g) => cancelDesign(g, p.id))}>Cancel design</button>
              </p>
            </>
          )}
          {(p.status === "ready" || p.status === "onSale") && (
            <p>
              <button onClick={() => onOrder(p.id)}>Order production…</button>
            </p>
          )}
          {(p.status === "ready" || p.status === "onSale") && (
            <div className="inline-actions">
              <label htmlFor="price">Price $</label>
              <input
                id="price"
                type="number"
                className="mid-num"
                min={1}
                value={price}
                onChange={(e) => setPriceInput(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              />
              {p.status === "ready" ? (
                <button className="primary" onClick={() => dispatch((g) => launchProduct(g, p.id, price))}>
                  Launch
                </button>
              ) : (
                <button onClick={() => dispatch((g) => setPrice(g, p.id, price))}>Set price</button>
              )}
              <button onClick={() => window.confirm(`Discontinue ${p.spec.name}? It stops selling in shops.`) && dispatch((g) => discontinueProduct(g, p.id))}>
                Discontinue
              </button>
            </div>
          )}
          {p.status === "ready" && (
            <p className="hint">Tip: order production before launching so there is stock on day one. Segment reference prices: {SEGMENTS.map((s) => `${s.name} ${formatMoney(s.refPrice)}`).join(", ")}.</p>
          )}
        </div>
      </div>
    </Section>
  );
}
