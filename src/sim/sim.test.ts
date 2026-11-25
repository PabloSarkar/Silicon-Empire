import { describe, expect, it } from "vitest";
import { STARTING_CASH } from "../data/balance";
import { RIVALS } from "../data/market";
import { STARTING_RESEARCH } from "../data/research";
import { formatDate, weekToDate } from "./calendar";
import { createNewGame, initialsFor, tick, validateNewGame } from "./game";
import { nextRandom } from "./rng";
import { newGame, params } from "./testUtils";

describe("calendar", () => {
  it("starts on 1 Jan 1975", () => {
    expect(weekToDate(0)).toEqual({ year: 1975, month: 1, day: 1 });
    expect(formatDate(0)).toBe("1 Jan 1975");
  });

  it("advances 7 days per week across year boundaries", () => {
    expect(formatDate(1)).toBe("8 Jan 1975");
    expect(formatDate(52)).toBe("31 Dec 1975");
    expect(formatDate(53)).toBe("7 Jan 1976");
  });
});

describe("rng", () => {
  it("is deterministic for the same state", () => {
    const a = nextRandom(42);
    const b = nextRandom(42);
    expect(a).toEqual(b);
    expect(a[0]).toBeGreaterThanOrEqual(0);
    expect(a[0]).toBeLessThan(1);
    expect(nextRandom(a[1])[0]).not.toBe(a[0]);
  });
});

describe("new game", () => {
  it("validates required fields", () => {
    const errors = validateNewGame({ ...params, companyName: " ", ceoName: "", logo: { ...params.logo, text: "" } });
    expect(Object.keys(errors).sort()).toEqual(["ceoName", "companyName", "logoText"]);
    expect(validateNewGame(params)).toEqual({});
  });

  it("creates a company with every system initialised", () => {
    const g = newGame();
    expect(g.week).toBe(0);
    expect(g.company.name).toBe("Test Semiconductor");
    expect(g.company.logo.text).toBe("AB");
    expect(g.company.cash).toBe(STARTING_CASH);
    expect(g.ceo).toEqual({ name: "Ada", archetype: "technical" });
    expect(g.research.completed).toEqual([...STARTING_RESEARCH]);
    expect(g.candidates).toHaveLength(6);
    expect(g.employees).toHaveLength(0);
    expect(new Set(g.rivalProducts.map((p) => p.rivalId))).toEqual(new Set(RIVALS.map((r) => r.id)));
    expect(g.sharePrice).toBeGreaterThan(0);
    expect(g.achievements).toContain("company_founded");
  });

  it("throws on invalid params", () => {
    expect(() => createNewGame({ ...params, ceoName: "" }, { id: "x", seed: 1 })).toThrow();
  });

  it("derives initials", () => {
    expect(initialsFor("Silicon Valley Works Inc")).toBe("SVW");
    expect(initialsFor("Zilog")).toBe("ZI");
    expect(initialsFor("  ")).toBe("");
  });
});

describe("tick", () => {
  it("advances one week without mutating the input", () => {
    const g = newGame();
    const before = JSON.stringify(g);
    const next = tick(g);
    expect(next.week).toBe(1);
    expect(JSON.stringify(g)).toBe(before);
  });

  it("is deterministic for the same seed", () => {
    let a = newGame(99);
    let b = newGame(99);
    for (let i = 0; i < 120; i++) {
      a = tick(a);
      b = tick(b);
    }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("closes the year: a review record, a new-year event, and a fresh ledger", () => {
    let g = newGame();
    for (let i = 0; i < 53; i++) g = tick(g);
    expect(g.years).toHaveLength(1);
    expect(g.years[0].year).toBe(1975);
    expect(g.events.some((e) => e.message === "The year 1976 begins.")).toBe(true);
    expect(g.lastLedger).not.toBeNull();
  });

  it("charges rent every week even with no staff", () => {
    const g = tick(newGame());
    expect(g.company.cash).toBeLessThan(STARTING_CASH);
  });

  it("an idle company is eventually replaced by the board, and the game then stops", () => {
    let g = newGame();
    for (let i = 0; i < 52 * 15 && !g.gameOver; i++) g = tick(g);
    expect(g.gameOver).not.toBeNull();
    expect(tick(g)).toBe(g);
  });
});
