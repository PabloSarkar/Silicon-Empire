import { describe, expect, it } from "vitest";
import { STARTING_CASH } from "../data/balance";
import { formatDate, weekToDate } from "./calendar";
import { createNewGame, initialsFor, tick, validateNewGame, type NewGameParams } from "./game";
import { nextRandom } from "./rng";

const params: NewGameParams = {
  archetype: "technical",
  logo: { shape: "hexagon", primaryColor: "#112233", secondaryColor: "#ffffff", font: "mono", text: "ab" },
  companyName: "  Test Semiconductor ",
  ceoName: "Ada",
};

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

  it("creates a trimmed game at week 0 with starting cash and a founding event", () => {
    const g = createNewGame(params, { id: "g1", seed: 7 });
    expect(g.week).toBe(0);
    expect(g.company.name).toBe("Test Semiconductor");
    expect(g.company.logo.text).toBe("AB");
    expect(g.company.cash).toBe(STARTING_CASH);
    expect(g.ceo).toEqual({ name: "Ada", archetype: "technical" });
    expect(g.events).toHaveLength(1);
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
    const g = createNewGame(params, { id: "g1", seed: 7 });
    const next = tick(g);
    expect(next.week).toBe(1);
    expect(g.week).toBe(0);
  });

  it("logs the start of a new year", () => {
    let g = createNewGame(params, { id: "g1", seed: 7 });
    for (let i = 0; i < 53; i++) g = tick(g);
    expect(g.events.at(-1)?.message).toBe("The year 1976 begins.");
    expect(g.events).toHaveLength(2);
  });

  it("runs 20 years headless", () => {
    let g = createNewGame(params, { id: "g1", seed: 7 });
    for (let i = 0; i < 52 * 20; i++) g = tick(g);
    expect(weekToDate(g.week).year).toBe(1994);
  });
});
