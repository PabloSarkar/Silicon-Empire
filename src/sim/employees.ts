// Employees: candidate generation, team output, happiness.

import { getArchetype } from "../data/archetypes";
import {
  BASE_HAPPINESS,
  CANDIDATE_COUNT,
  MAX_TAX_REDUCTION,
  MIN_RETAIL_CUT,
  QUIT_CHANCE,
  QUIT_HAPPINESS,
  RETAIL_CUT,
} from "../data/balance";
import {
  ATTRACTS,
  CEO_BASE_STAT,
  CEO_STATS,
  EMPLOYEE_TYPES,
  FIRST_NAMES,
  LAST_NAMES,
  STATS,
  getEmployeeType,
  type EmployeeType,
  type StatId,
} from "../data/employees";
import { wageIndex } from "../data/market";
import { addEvent } from "./events";
import { chance, clamp, newId, pick, pickWeighted, randInt } from "./random";
import type { Candidate, Employee, GameState, Stats } from "./types";

export function emptyStats(value = 0): Stats {
  return Object.fromEntries(STATS.map((s) => [s.id, value])) as Stats;
}

export function ceoStats(s: GameState): Stats {
  return { ...emptyStats(CEO_BASE_STAT), ...CEO_STATS[s.ceo.archetype] };
}

/** Weekly salary for given stats at a given week. */
export function salaryFor(stats: Stats, week: number): number {
  const top = Object.values(stats).sort((a, b) => b - a);
  const skill = (top[0] + top[1]) / 2;
  return Math.round(((250 + 10 * skill) * wageIndex(week)) / 10) * 10;
}

export function generateCandidate(s: GameState): Candidate {
  const attracted = ATTRACTS[s.ceo.archetype];
  const type = pickWeighted(s, EMPLOYEE_TYPES, (t) => (attracted.includes(t.id) ? 3 : 1)).id;
  const def = getEmployeeType(type);
  const bonus = attracted.includes(type) ? 10 : 0;
  const stats = emptyStats();
  for (const stat of STATS) {
    let value: number;
    if (def.primary.includes(stat.id)) value = randInt(s, 40, 80) + bonus;
    else if (def.secondary.includes(stat.id)) value = randInt(s, 20, 50) + bonus / 2;
    else value = randInt(s, 0, 25);
    stats[stat.id] = clamp(value, 0, 100);
  }
  return {
    id: newId(s, "c"),
    name: `${pick(s, FIRST_NAMES)} ${pick(s, LAST_NAMES)}`,
    type,
    stats,
    salary: salaryFor(stats, s.week),
  };
}

export function refreshCandidates(s: GameState): void {
  s.candidates = Array.from({ length: CANDIDATE_COUNT }, () => generateCandidate(s));
}

/** Productivity multiplier from happiness: 0.6 at 0, 1.0 at 50, 1.4 at 100. */
export function productivity(happiness: number): number {
  return 0.6 + (0.8 * happiness) / 100;
}

function teamSum(s: GameState, f: (stats: Stats, type: EmployeeType | "ceo") => number): number {
  let total = f(ceoStats(s), "ceo");
  for (const e of s.employees) total += f(e.stats, e.type) * productivity(e.happiness);
  return total;
}

/** Diminishing returns: 0 at 0, approaches 1 as `score` grows; 0.5 at `half`. */
function saturate(score: number, half: number): number {
  return score / (score + half);
}

export interface TeamOutput {
  researchPerWeek: number;
  designPerWeek: number;
  /** 0–1: reduces defects and lead time. */
  production: number;
  /** Multiplier bonus on product popularity (0 = none). */
  marketing: number;
  /** Bonus on contract win chance. */
  negotiation: number;
  /** Bonus on contract payments. */
  contractMargin: number;
  /** Share of retail revenue kept by distributors. */
  retailCut: number;
  taxRate: number;
  /** Weekly credit score drift from finance skill. */
  creditDrift: number;
  /** Happiness bonus from HR. */
  hrHappiness: number;
}

export function teamOutput(s: GameState, baseTaxRate: number): TeamOutput {
  const mods = getArchetype(s.ceo.archetype).modifiers;
  const by = (stat: StatId, types?: EmployeeType[]) =>
    teamSum(s, (st, type) => (types && type !== "ceo" && !types.includes(type) ? 0 : st[stat]) / 10);

  const research = teamSum(s, (st) => (st.research + 0.5 * st.engineering) / 10);
  const design = teamSum(s, (st) => (st.design + 0.5 * st.engineering) / 10);
  const production = teamSum(s, (st) => (st.production + 0.5 * st.engineering) / 10);
  const marketing = by("marketing");
  const business = by("business");
  const negotiators = by("business", ["negotiator"]);
  const finance = by("finance");
  const sales = teamSum(s, (st, type) => (type === "sales" ? (st.marketing + st.business) / 10 : 0));
  const taxSkill = teamSum(s, (st, type) => (type === "tax" ? st.finance / 10 : 0));
  const hr = teamSum(s, (st, type) => (type === "hr" ? st.charisma / 10 : 0));

  return {
    researchPerWeek: research * (1 + (mods.researchSpeed ?? 0)),
    designPerWeek: design * (1 + (mods.designSpeed ?? 0)),
    production: saturate(production, 25) * (1 + (mods.productionSpeed ?? 0)),
    marketing: 0.5 * saturate(marketing, 30),
    negotiation: 0.25 * saturate(business + negotiators, 30) + (mods.contractChance ?? 0),
    contractMargin: 0.2 * saturate(negotiators + finance, 30),
    retailCut: RETAIL_CUT - (RETAIL_CUT - MIN_RETAIL_CUT) * saturate(sales, 20),
    taxRate: baseTaxRate - MAX_TAX_REDUCTION * saturate(taxSkill, 15),
    creditDrift: 0.15 * saturate(finance, 30),
    hrHappiness: 20 * saturate(hr, 10),
  };
}

/** Moves each employee's happiness toward its target and handles quitting. */
export function updateHappiness(s: GameState, hrHappiness: number): void {
  const mods = getArchetype(s.ceo.archetype).modifiers;
  const ceoBonus = 100 * (mods.employeeHappiness ?? 0);
  const businessSkill = s.employees.reduce((sum, e) => sum + e.stats.business, 0) / 10;
  const businessBonus = 10 * saturate(businessSkill, 20);

  // Charisma works within a department (Q-7, D-026): the most charismatic
  // person in each employee type lifts everyone else of that type.
  const bestCharisma = new Map<EmployeeType, number>();
  for (const e of s.employees) {
    bestCharisma.set(e.type, Math.max(bestCharisma.get(e.type) ?? 0, e.stats.charisma));
  }

  const leaving: Employee[] = [];
  for (const e of s.employees) {
    const target = clamp(
      BASE_HAPPINESS + hrHappiness + ceoBonus + businessBonus + (bestCharisma.get(e.type) ?? 0) / 10 - 5,
      0,
      100,
    );
    e.happiness = clamp(e.happiness + (target - e.happiness) * 0.1, 0, 100);
    if (e.happiness < QUIT_HAPPINESS && chance(s, QUIT_CHANCE)) leaving.push(e);
  }
  for (const e of leaving) {
    s.employees = s.employees.filter((x) => x.id !== e.id);
    addEvent(s, `${e.name} (${getEmployeeType(e.type).name}) quit because they were unhappy.`, true);
  }
}

/** Each year, employees get a little better at their main skill. */
export function yearlyGrowth(s: GameState): void {
  for (const e of s.employees) {
    for (const stat of getEmployeeType(e.type).primary) {
      e.stats[stat] = clamp(e.stats[stat] + 2, 0, 100);
    }
  }
}

export function weeklySalaries(s: GameState): number {
  return s.employees.reduce((sum, e) => sum + e.salary, 0);
}
