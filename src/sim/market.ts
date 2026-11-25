// Market simulation: rivals release chips, buyers in three segments choose
// between all chips on sale (including "don't buy"), and analysts review
// player launches.

import { getArchetype } from "../data/archetypes";
import { HOT_TEMP_C, MAX_SAFE_TEMP_C } from "../data/balance";
import {
  OUTSIDE_OPTION,
  RIVALS,
  SEGMENTS,
  marketUnitsPerWeek,
  type RivalDef,
  type Segment,
  type SegmentId,
} from "../data/market";
import { referenceDesign, type DesignProfile } from "./cpu";
import { addEvent } from "./events";
import { clamp, newId, pick, randInt, uniform } from "./random";
import type { AnalystReview, GameState, Product, RivalProduct } from "./types";

const PROFILES: Record<SegmentId, DesignProfile> = {
  budget: { clockFrac: 0.6, coreFrac: 0.25 },
  mainstream: { clockFrac: 0.85, coreFrac: 0.5 },
  enthusiast: { clockFrac: 1, coreFrac: 1 },
};

/** Rival products are taken off the market after this many weeks. */
const RIVAL_PRODUCT_LIFE = 156;

export function initRivals(s: GameState): void {
  s.rivals = RIVALS.map((r) => ({ id: r.id, nextReleaseWeek: randInt(s, 30, 70), releases: 0 }));
  s.rivalProducts = [];
  for (const def of RIVALS) releaseRivalProduct(s, def, true);
}

function releaseRivalProduct(s: GameState, def: RivalDef, quiet = false): void {
  const state = s.rivals.find((r) => r.id === def.id)!;
  const segment = pick(s, def.segments);
  const base = PROFILES[segment];
  const profile = { clockFrac: clamp(base.clockFrac * uniform(s, 0.9, 1.05), 0.1, 1), coreFrac: base.coreFrac };
  state.releases += 1;
  const name = `${def.prefix}-${state.releases * 100 + randInt(s, 0, 9) * 10}`;
  const { stats } = referenceDesign(s.week, def.lagYears, profile, name);
  const refPrice = SEGMENTS.find((x) => x.id === segment)!.refPrice;
  const price = Math.max(5, Math.round((refPrice * def.priceMult * uniform(s, 0.85, 1.15)) / 5) * 5);

  const product: RivalProduct = {
    id: newId(s, "r"),
    rivalId: def.id,
    name,
    segment,
    perf: stats.perf,
    powerW: stats.powerW,
    price,
    launchedWeek: s.week,
    lastWeekSales: 0,
  };
  s.rivalProducts.push(product);

  // Each rival keeps at most two chips on sale.
  const own = s.rivalProducts.filter((p) => p.rivalId === def.id);
  if (own.length > 2) {
    const oldest = own.reduce((a, b) => (a.launchedWeek <= b.launchedWeek ? a : b));
    s.rivalProducts = s.rivalProducts.filter((p) => p.id !== oldest.id);
  }
  if (!quiet) {
    addEvent(s, `${def.name} launched the ${name} (${segmentName(segment)}, $${price}).`);
  }
}

export function updateRivals(s: GameState): void {
  for (const def of RIVALS) {
    const state = s.rivals.find((r) => r.id === def.id)!;
    if (s.week >= state.nextReleaseWeek) {
      releaseRivalProduct(s, def);
      state.nextReleaseWeek = s.week + randInt(s, 40, 80);
    }
  }
  // Retire very old chips, but every rival keeps at least one.
  s.rivalProducts = s.rivalProducts.filter((p) => {
    if (s.week - p.launchedWeek <= RIVAL_PRODUCT_LIFE) return true;
    return s.rivalProducts.filter((q) => q.rivalId === p.rivalId).length <= 1;
  });
}

function segmentName(id: SegmentId): string {
  return SEGMENTS.find((x) => x.id === id)!.name;
}

function ageFactor(weeksOnSale: number): number {
  if (weeksOnSale < 8) return 1.15;
  if (weeksOnSale < 104) return 1;
  return Math.max(0.5, 1 - 0.005 * (weeksOnSale - 104));
}

export function qualityFactor(tempC: number): number {
  if (tempC > MAX_SAFE_TEMP_C) return 0.3;
  if (tempC > HOT_TEMP_C) return 0.85;
  return 1;
}

function priceTerm(price: number, segment: Segment): number {
  return Math.min(4, Math.pow(price / segment.refPrice, -segment.priceWeight));
}

/** Brand strength of the player's company for a product in a segment. */
export function playerBrand(s: GameState, product: Product, segment: SegmentId, marketingBonus: number): number {
  const mods = getArchetype(s.ceo.archetype).modifiers;
  const reputation = 0.3 + (1.4 * s.company.reputation) / 100;
  const review = product.review ? 0.7 + 0.06 * product.review.score : 1;
  const mainstream = segment === "mainstream" ? 1 + (mods.mainstreamPopularity ?? 0) : 1;
  return reputation * review * (1 + marketingBonus) * mainstream;
}

function rivalBrand(rivalId: string): number {
  return RIVALS.find((r) => r.id === rivalId)!.popularity / 50;
}

/** Best performance of any chip currently on sale. */
export function bestPerfOnMarket(s: GameState): number {
  const perfs = [
    ...s.rivalProducts.map((p) => p.perf),
    ...s.products.filter((p) => p.status === "onSale").map((p) => p.stats.perf),
  ];
  return Math.max(1e-9, ...perfs);
}

export interface SalesResult {
  /** Units sold per player product id. */
  units: Record<string, number>;
  /** Net revenue after the retail cut. */
  revenue: number;
  /** Player's share of all chips sold this week, 0–1. */
  playerShare: number;
}

/** Runs one week of retail sales. Mutates inventory and product totals. */
export function runMarketWeek(s: GameState, marketingBonus: number, retailCut: number): SalesResult {
  const best = bestPerfOnMarket(s);
  const total = marketUnitsPerWeek(s.week);
  const onSale = s.products.filter((p) => p.status === "onSale" && p.inventory > 0);

  const demand: Record<string, number> = {};
  for (const r of s.rivalProducts) r.lastWeekSales = 0;

  for (const segment of SEGMENTS) {
    const entries: { id: string; appeal: number; rival: boolean }[] = [];
    for (const p of onSale) {
      const appeal =
        playerBrand(s, p, segment.id, marketingBonus) *
        Math.pow(p.stats.perf / best, segment.perfWeight) *
        priceTerm(p.price, segment) *
        qualityFactor(p.stats.tempC) *
        ageFactor(s.week - (p.launchedWeek ?? s.week));
      entries.push({ id: p.id, appeal, rival: false });
    }
    for (const r of s.rivalProducts) {
      const appeal =
        rivalBrand(r.rivalId) *
        Math.pow(r.perf / best, segment.perfWeight) *
        priceTerm(r.price, segment) *
        ageFactor(s.week - r.launchedWeek);
      entries.push({ id: r.id, appeal, rival: true });
    }
    const sum = entries.reduce((acc, e) => acc + e.appeal, OUTSIDE_OPTION);
    const segmentUnits = total * segment.share;
    for (const e of entries) {
      const units = (segmentUnits * e.appeal) / sum;
      if (e.rival) {
        const r = s.rivalProducts.find((x) => x.id === e.id)!;
        r.lastWeekSales += units;
      } else {
        demand[e.id] = (demand[e.id] ?? 0) + units;
      }
    }
  }

  const result: SalesResult = { units: {}, revenue: 0, playerShare: 0 };
  for (const p of s.products) p.lastWeekSales = 0;
  for (const p of onSale) {
    const units = Math.min(p.inventory, Math.floor(demand[p.id] ?? 0));
    if (units <= 0) continue;
    const revenue = units * p.price * (1 - retailCut);
    p.inventory -= units;
    if (p.inventory === 0) {
      addEvent(s, `${p.spec.name} is sold out. Order more from a foundry (Foundry / Fab Contracts).`, true);
    }
    p.unitsSold += units;
    p.revenue += revenue;
    p.lastWeekSales = units;
    result.units[p.id] = units;
    result.revenue += revenue;
  }
  for (const r of s.rivalProducts) r.lastWeekSales = Math.round(r.lastWeekSales);
  const playerUnits = Object.values(result.units).reduce((a, b) => a + b, 0);
  const rivalUnits = s.rivalProducts.reduce((a, r) => a + r.lastWeekSales, 0);
  result.playerShare = playerUnits / Math.max(1, playerUnits + rivalUnits);
  return result;
}

/**
 * Reputation slowly follows market presence: a big market share builds a
 * brand, disappearing from shelves erodes it. Contracts and reviews add
 * one-off jumps on top (README §2.9).
 */
export function driftReputation(s: GameState, playerShare: number): void {
  const target = 15 + 85 * Math.sqrt(playerShare);
  s.company.reputation = clamp(s.company.reputation + (target - s.company.reputation) * 0.02, 0, 100);
}

/** Review written by industry analysts when a product launches. */
export function analystReview(s: GameState, product: Product, marketingBonus: number): AnalystReview {
  const mods = getArchetype(s.ceo.archetype).modifiers;
  const rivals = s.rivalProducts;
  const bestRival = Math.max(1e-9, ...rivals.map((r) => r.perf));
  const avgValue = rivals.length
    ? rivals.reduce((sum, r) => sum + r.perf / r.price, 0) / rivals.length
    : product.stats.perf / product.price;
  const avgPower = rivals.length ? rivals.reduce((sum, r) => sum + r.powerW, 0) / rivals.length : product.stats.powerW;

  const perfRatio = product.stats.perf / bestRival;
  const valueRatio = product.stats.perf / product.price / avgValue;
  const notes: string[] = [];
  let score = 5 + 2.2 * Math.log2(perfRatio) + 1.5 * Math.log2(valueRatio);

  if (perfRatio >= 1.1) notes.push("Fastest chip on the market.");
  else if (perfRatio >= 0.9) notes.push("Performance matches the market leaders.");
  else if (perfRatio < 0.6) notes.push("Falls well behind the current performance leaders.");

  if (valueRatio >= 1.5) notes.push("Excellent value for money.");
  else if (valueRatio <= 0.7) notes.push("Overpriced for what it offers.");

  if (product.stats.tempC > MAX_SAFE_TEMP_C) {
    score -= 4;
    notes.push("Overheats and crashes under load.");
  } else if (product.stats.tempC > HOT_TEMP_C) {
    score -= 1.5;
    notes.push("Runs hot.");
  }
  if (product.stats.powerW < avgPower * 0.6) {
    score += 0.5;
    notes.push("Very power-efficient.");
  }

  score += 10 * (mods.analystReputation ?? 0) + 2 * marketingBonus;
  if (notes.length === 0) notes.push("A solid, unremarkable chip.");
  return { score: Math.round(clamp(score, 0, 10) * 10) / 10, notes };
}

/** Units sold last week by company name, for the market share table. */
export function marketShare(s: GameState): { name: string; units: number; player: boolean }[] {
  const rows = RIVALS.map((r) => ({
    name: r.name,
    units: s.rivalProducts.filter((p) => p.rivalId === r.id).reduce((sum, p) => sum + p.lastWeekSales, 0),
    player: false,
  }));
  rows.unshift({
    name: s.company.name,
    units: s.products.reduce((sum, p) => sum + p.lastWeekSales, 0),
    player: true,
  });
  return rows;
}
