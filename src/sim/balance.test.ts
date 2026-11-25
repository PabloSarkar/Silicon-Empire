// Headless balance checks (README §4.1): a simple bot plays for decades.
// These guard against broken economics (NaN, runaway numbers, impossible
// starts), not exact values. Retune src/data/balance.ts with them.

import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "../data/archetypes";
import { evaluateDesign, referenceDesign, techFrom, researchForWeek } from "./cpu";
import { botTurn } from "./bot";
import { createNewGame, tick } from "./game";
import { params } from "./testUtils";
import type { CeoArchetypeId, GameState } from "./types";
import { MAX_SAFE_TEMP_C } from "../data/balance";

function play(archetype: CeoArchetypeId, seed: number, years: number): GameState {
  let g = createNewGame({ ...params, archetype }, { id: "bot", seed });
  for (let w = 0; w < 52 * years && !g.gameOver; w++) g = tick(botTurn(g));
  return g;
}

describe("chip model", () => {
  it("reference designs stay buildable in every era", () => {
    for (let year = 1975; year <= 2025; year++) {
      const week = Math.round((year - 1975) * 52.18) + 1;
      const { spec, stats } = referenceDesign(week, 0, { clockFrac: 0.85, coreFrac: 0.5 });
      expect(stats.perf, `${year}`).toBeGreaterThan(0);
      expect(stats.tempC, `${year}`).toBeLessThan(MAX_SAFE_TEMP_C);
      expect(stats.rawUnitCost, `${year}`).toBeLessThan(100);
      // Same result when evaluated directly.
      expect(evaluateDesign(spec, techFrom(researchForWeek(week))).perf).toBeCloseTo(stats.perf);
    }
  });

  it("performance grows over time", () => {
    const perf = (year: number) => referenceDesign(Math.round((year - 1975) * 52.18) + 1, 0, { clockFrac: 0.85, coreFrac: 0.5 }).stats.perf;
    expect(perf(1985)).toBeGreaterThan(perf(1975) * 10);
    expect(perf(2005)).toBeGreaterThan(perf(1985) * 10);
  });
});

describe("balance (bot player)", () => {
  for (const a of ARCHETYPES) {
    it(`${a.name}: survives 25 years with finite, sensible numbers`, () => {
      const g = play(a.id, 11, 25);
      expect(g.gameOver, g.gameOver?.reason).toBeNull();
      expect(Number.isFinite(g.company.cash)).toBe(true);
      expect(Number.isFinite(g.sharePrice)).toBe(true);
      expect(g.company.reputation).toBeGreaterThanOrEqual(0);
      expect(g.company.reputation).toBeLessThanOrEqual(100);
      expect(g.years.slice(0, 5).some((y) => y.netProfit > 0)).toBe(true);
      expect(g.products.some((p) => p.unitsSold > 0)).toBe(true);
    });
  }
});
