// Rented production at third-party foundries (D-013).

import { FABS, getFab, yearOf, type FabDef } from "../data/market";
import { getResearchNode } from "../data/research";
import { addEvent, unlockAchievement } from "./events";
import { clamp } from "./random";
import type { GameState, Product } from "./types";

/** Newest process year this fab offers in the given week. */
export function fabNewestYear(fab: FabDef, week: number): number {
  return Math.max(1975, Math.floor(yearOf(week)) - fab.lagYears);
}

export function fabSupportsNode(fab: FabDef, nodeId: string, week: number): boolean {
  return getResearchNode(nodeId).year <= fabNewestYear(fab, week);
}

export interface FabQuote {
  fab: FabDef;
  quantity: number;
  unitCost: number;
  totalCost: number;
  defectRate: number;
  goodUnits: number;
  leadWeeks: number;
  /** Reasons the order can't be placed; empty if it can. */
  problems: string[];
}

/**
 * Price and delivery for an order. `production` is the team's production
 * skill (0–1+), which lowers defects and lead time.
 */
export function fabQuote(
  s: GameState,
  product: Product,
  fabId: string,
  quantity: number,
  production: number,
): FabQuote {
  const fab = getFab(fabId);
  const skill = clamp(production, 0, 1);
  const unitCost = product.stats.rawUnitCost * fab.priceMult;
  const qty = Math.max(0, Math.floor(quantity));
  const defectRate = fab.defectRate * (1 - 0.5 * skill);
  const totalCost = Math.round(unitCost * qty);
  const problems: string[] = [];
  if (product.status === "development" || product.status === "discontinued") {
    problems.push("Only finished, non-discontinued designs can be manufactured.");
  }
  if (!fabSupportsNode(fab, product.spec.nodeId, s.week)) {
    const node = getResearchNode(product.spec.nodeId);
    problems.push(`${fab.name} does not offer the ${node.name} process yet.`);
  }
  if (qty < fab.minOrder) problems.push(`Minimum order at ${fab.name} is ${fab.minOrder.toLocaleString("en-US")} chips.`);
  if (totalCost > s.company.cash) problems.push("Not enough cash for this order.");
  return {
    fab,
    quantity: qty,
    unitCost,
    totalCost,
    defectRate,
    goodUnits: Math.floor(qty * (1 - defectRate)),
    leadWeeks: Math.max(1, Math.round(fab.leadWeeks * (1 - 0.4 * skill))),
    problems,
  };
}

export function deliverFabOrders(s: GameState): void {
  const due = s.fabOrders.filter((o) => o.deliveryWeek <= s.week);
  if (due.length === 0) return;
  for (const order of due) {
    const product = s.products.find((p) => p.id === order.productId);
    if (product) {
      product.inventory += order.goodUnits;
      addEvent(
        s,
        `${getFab(order.fabId).name} delivered ${order.goodUnits.toLocaleString("en-US")} ${product.spec.name} chips.`,
        true,
      );
      unlockAchievement(s, "first_production_run");
    }
  }
  s.fabOrders = s.fabOrders.filter((o) => o.deliveryWeek > s.week);
}

export { FABS };
