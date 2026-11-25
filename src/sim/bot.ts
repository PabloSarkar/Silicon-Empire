// A simple automatic player used by headless balance tests (README §4.1).
// It is not used by the game itself. It plays sensibly but not cleverly, so a
// human should do at least as well.

import { BASE_TAX_RATE } from "../data/balance";
import { FABS, SEGMENTS, marketUnitsPerWeek } from "../data/market";
import { researchCashCost, researchPointCost, RESEARCH_NODES } from "../data/research";
import {
  ActionError,
  bidContract,
  deliverContract,
  discontinueProduct,
  hireCandidate,
  launchProduct,
  orderProduction,
  startDesign,
  startResearch,
} from "./actions";
import { meetsContract } from "./contracts";
import { bestDesign } from "./cpu";
import { teamOutput, weeklySalaries } from "./employees";
import { fabQuote, fabSupportsNode } from "./production";
import { researchStatus } from "./research";
import type { GameState, Product } from "./types";

function attempt(s: GameState, f: (s: GameState) => GameState): GameState {
  try {
    return f(s);
  } catch (e) {
    if (e instanceof ActionError) return s;
    throw e;
  }
}

const TEAM_PLAN: { type: string; per: number }[] = [
  { type: "designer", per: 3 },
  { type: "researcher", per: 3 },
  { type: "engineer", per: 2 },
  { type: "sales", per: 1 },
  { type: "negotiator", per: 1 },
  { type: "tax", per: 1 },
  { type: "hr", per: 1 },
];

/** Plays one week's worth of decisions (call before tick). */
export function botTurn(state: GameState): GameState {
  let s = state;
  const out = teamOutput(s, BASE_TAX_RATE);
  const weeklyCost = weeklySalaries(s) + 1000;
  const reserve = weeklyCost * 12;

  // Hire: grow the team while cash covers ~a year of costs.
  const target = Math.min(40, 2 + Math.floor(s.week / 52));
  if (s.employees.length < target && s.company.cash > reserve + weeklyCost * 40) {
    const counts = (t: string) => s.employees.filter((e) => e.type === t).length;
    const need = TEAM_PLAN.find((p) => counts(p.type) < Math.ceil((p.per * target) / 12));
    const cand = s.candidates.find((c) => c.type === (need?.type ?? "engineer"));
    if (cand) s = attempt(s, (x) => hireCandidate(x, cand.id));
  }

  // Research: cheapest available tier.
  if (!s.research.current) {
    const options = RESEARCH_NODES.filter((n) => researchStatus(s, n.id) === "available")
      .filter((n) => researchCashCost(n) < s.company.cash - reserve)
      .sort((a, b) => researchPointCost(a) - researchPointCost(b));
    if (options[0]) s = attempt(s, (x) => startResearch(x, options[0].id));
  }

  // Design: a new chip when none is in development and the newest is a year old.
  const developing = s.products.some((p) => p.status === "development");
  const newest = s.products.reduce<Product | null>((a, p) => (!a || p.createdWeek > a.createdWeek ? p : a), null);
  if (!developing && (!newest || s.week - newest.createdWeek > 52)) {
    const n = s.products.length + 1;
    const { spec } = bestDesign(s.research.completed, { clockFrac: 0.9, coreFrac: 0.5 }, `Bot ${n}`);
    // Only design on a process some fab offers right now.
    if (FABS.some((f) => fabSupportsNode(f, spec.nodeId, s.week))) {
      s = attempt(s, (x) => startDesign(x, spec));
    }
  }

  const weeklyDemand = marketUnitsPerWeek(s.week) * 0.25;
  for (const p of s.products) {
    if (p.status === "ready" && p.inventory > 0) {
      // Discontinue older chips, then launch the new one at a mainstream price.
      for (const old of s.products.filter((q) => q.status === "onSale" && q.id !== p.id)) {
        s = attempt(s, (x) => discontinueProduct(x, old.id));
      }
      const price = SEGMENTS.find((x) => x.id === "mainstream")!.refPrice * 0.8;
      s = attempt(s, (x) => launchProduct(x, p.id, price));
    }
  }

  // Production: keep about 8 weeks of stock for the product on sale.
  for (const p of s.products.filter((q) => q.status === "onSale" || q.status === "ready")) {
    const pending = s.fabOrders.some((o) => o.productId === p.id);
    const weekly = Math.max(p.lastWeekSales, weeklyDemand * 0.3);
    if (!pending && p.inventory < weekly * 4) {
      const fab = FABS.filter((f) => fabSupportsNode(f, p.spec.nodeId, s.week))
        .map((f) => fabQuote(s, p, f.id, Math.max(f.minOrder, weekly * 8), out.production))
        .filter((q) => q.problems.length === 0 && q.totalCost < s.company.cash - reserve / 2)
        .sort((a, b) => a.unitCost - b.unitCost)[0];
      if (fab) s = attempt(s, (x) => orderProduction(x, p.id, fab.fab.id, fab.quantity));
    }
  }

  // Contracts: bid on offers the current chip meets; deliver when stock allows.
  const onSale = s.products.find((p) => p.status === "onSale");
  if (onSale) {
    for (const c of s.contracts) {
      if (c.status === "open" && meetsContract(onSale.stats, c).all) s = attempt(s, (x) => bidContract(x, c.id));
      if (c.status === "active") {
        const fit = s.products.find((p) => p.inventory >= c.units && meetsContract(p.stats, c).all);
        if (fit) s = attempt(s, (x) => deliverContract(x, c.id, fit.id));
      }
    }
  }
  return s;
}

