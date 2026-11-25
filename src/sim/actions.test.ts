import { describe, expect, it } from "vitest";
import { FABS } from "../data/market";
import { researchCashCost, getResearchNode } from "../data/research";
import {
  ActionError,
  bidContract,
  cancelDesign,
  deliverContract,
  fireEmployee,
  hireCandidate,
  issueShares,
  launchProduct,
  orderProduction,
  repayLoan,
  startDesign,
  startResearch,
  takeLoan,
} from "./actions";
import { generateOffer } from "./contracts";
import { bestDesign } from "./cpu";
import { tick } from "./game";
import { researchStatus } from "./research";
import type { GameState } from "./types";
import { newGame } from "./testUtils";

function runWeeks(g: GameState, n: number): GameState {
  for (let i = 0; i < n; i++) g = tick(g);
  return g;
}

function firstDesign(g: GameState) {
  return bestDesign(g.research.completed, { clockFrac: 0.85, coreFrac: 0.5 }, "T-100").spec;
}

/** A game with one finished, stocked chip on sale. */
function gameWithChip(): GameState {
  let g = newGame();
  const designer = g.candidates[0];
  g = hireCandidate(g, designer.id);
  g = startDesign(g, firstDesign(g));
  for (let i = 0; i < 200 && g.products[0].status === "development"; i++) g = tick(g);
  expect(g.products[0].status).toBe("ready");
  g = orderProduction(g, g.products[0].id, FABS[0].id, 5000);
  g = runWeeks(g, 10);
  g = launchProduct(g, g.products[0].id, 120);
  return g;
}

describe("actions", () => {
  it("never mutate the input state", () => {
    const g = newGame();
    const before = JSON.stringify(g);
    hireCandidate(g, g.candidates[0].id);
    startDesign(g, firstDesign(g));
    expect(JSON.stringify(g)).toBe(before);
  });

  it("hiring charges a fee and adds the employee; firing removes them", () => {
    let g = newGame();
    const c = g.candidates[0];
    g = hireCandidate(g, c.id);
    expect(g.employees.map((e) => e.id)).toEqual([c.id]);
    expect(g.candidates.some((x) => x.id === c.id)).toBe(false);
    expect(g.ledger.hiring).toBeGreaterThan(0);
    g = fireEmployee(g, c.id);
    expect(g.employees).toHaveLength(0);
  });

  it("research: pays cash once, respects year gates, and completes", () => {
    let g = newGame();
    expect(() => startResearch(g, "node-3um")).toThrow(ActionError);
    // 8 µm needs 1977; wait until then.
    g = runWeeks(g, 2 * 52 + 2);
    if (g.gameOver) throw new Error("company failed too early");
    expect(researchStatus(g, "node-8um")).toBe("available");
    const cash = g.company.cash;
    g = startResearch(g, "node-8um");
    expect(g.company.cash).toBe(cash - researchCashCost(getResearchNode("node-8um")));
    for (let i = 0; i < 300 && !g.research.completed.includes("node-8um"); i++) g = tick(g);
    expect(g.research.completed).toContain("node-8um");
    expect(g.research.current).toBeNull();
  });

  it("design: one at a time, mask cost charged, cancel works", () => {
    let g = newGame();
    const spec = firstDesign(g);
    g = startDesign(g, spec);
    expect(g.products[0].status).toBe("development");
    expect(g.ledger.design).toBe(g.products[0].stats.maskCost);
    expect(() => startDesign(g, { ...spec, name: "Second" })).toThrow(/one chip at a time/);
    g = cancelDesign(g, g.products[0].id);
    expect(g.products).toHaveLength(0);
  });

  it("rejects designs that use unresearched tech or exceed the socket's power", () => {
    const g = newGame();
    expect(() => startDesign(g, { ...firstDesign(g), nodeId: "node-3um" })).toThrow(/not been researched/);
    expect(() => startDesign(g, { ...firstDesign(g), widthId: "arch-8bit", cores: 4 })).toThrow(/Cores/);
  });

  it("full loop: design → production → launch → sales", () => {
    let g = gameWithChip();
    const p = g.products[0];
    expect(p.status).toBe("onSale");
    expect(p.review).not.toBeNull();
    expect(p.inventory).toBeGreaterThan(0);
    const stock = p.inventory;
    g = runWeeks(g, 4);
    expect(g.products[0].unitsSold).toBeGreaterThan(0);
    expect(g.products[0].inventory).toBeLessThan(stock);
    expect(g.ledger.salesRevenue).toBeGreaterThan(0);
    expect(g.achievements).toContain("first_cpu_shipped");
  });

  it("production orders enforce the minimum order", () => {
    let g = newGame();
    g = startDesign(g, firstDesign(g));
    for (let i = 0; i < 200 && g.products[0].status === "development"; i++) g = tick(g);
    expect(() => orderProduction(g, g.products[0].id, FABS[2].id, 10)).toThrow(/Minimum order/);
  });

  it("contracts: bid, win or lose next week, deliver for payment", () => {
    let g = gameWithChip();
    // Inject an easy offer the chip meets, so the test doesn't depend on luck.
    const offer = { ...generateOffer(structuredClone(g)), minPerf: 0, maxPowerW: 100, maxTempC: 100, units: 100 };
    g = { ...g, contracts: [...g.contracts, offer] };
    g = bidContract(g, offer.id);
    const bid = g.contracts.find((c) => c.id === offer.id)!;
    expect(bid.status).toBe("bidding");
    g = { ...g, contracts: g.contracts.map((c) => (c.id === offer.id ? { ...c, winChance: 1 } : c)) };
    g = tick(g);
    expect(g.contracts.find((c) => c.id === offer.id)!.status).toBe("active");
    const cash = g.company.cash;
    g = deliverContract(g, offer.id, g.products[0].id);
    const done = g.contracts.find((c) => c.id === offer.id)!;
    expect(done.status).toBe("completed");
    expect(g.company.cash).toBeGreaterThan(cash);
  });

  it("loans: borrowing adds cash and lowers credit; repaying clears the loan", () => {
    let g = newGame();
    const score = g.bank.creditScore;
    g = takeLoan(g, 50_000, 5);
    expect(g.company.cash).toBeGreaterThan(250_000);
    expect(g.bank.creditScore).toBeLessThan(score);
    const shortHit = score - takeLoan(newGame(), 50_000, 1).bank.creditScore;
    expect(score - g.bank.creditScore).toBeGreaterThan(shortHit); // Longer loans cost more score.
    g = runWeeks(g, 4);
    expect(g.bank.loans[0].balance).toBeLessThan(50_000);
    g = repayLoan(g, g.bank.loans[0].id);
    expect(g.bank.loans).toHaveLength(0);
  });

  it("share issues raise cash and dilute the founder, once per year", () => {
    let g = newGame();
    g = issueShares(g);
    expect(g.company.cash).toBeGreaterThan(250_000);
    expect(g.investors.founderShares / (g.investors.founderShares + g.investors.investorShares)).toBeLessThan(0.7);
    expect(() => issueShares(g)).toThrow(/once per year/);
  });
});
