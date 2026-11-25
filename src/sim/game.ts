// Creating a new game and advancing time.

import {
  BASE_TAX_RATE,
  CANDIDATE_REFRESH_WEEKS,
  FIRST_YEAR_EXPECTATION,
  FOUNDER_SHARE_FRACTION,
  OFFICE_BASE_WEEKLY,
  OFFICE_PER_EMPLOYEE_WEEKLY,
  STARTING_CASH,
  STARTING_CREDIT_SCORE,
  STARTING_GOODWILL,
  STARTING_REPUTATION,
  TOTAL_SHARES,
} from "../data/balance";
import { wageIndex } from "../data/market";
import { STARTING_RESEARCH } from "../data/research";
import { calendarYear, formatDate } from "./calendar";
import { updateContracts } from "./contracts";
import { refreshCandidates, teamOutput, updateHappiness, weeklySalaries, yearlyGrowth } from "./employees";
import { addEvent, unlockAchievement } from "./events";
import { chargeExpense, closeWeek, computeSharePrice, earn, emptyLedger, weeklyBank, yearEnd } from "./finance";
import { driftReputation, initRivals, runMarketWeek, updateRivals } from "./market";
import { deliverFabOrders } from "./production";
import { progressDesign, progressResearch } from "./research";
import { seedToState } from "./rng";
import type { CeoArchetypeId, GameState, Logo } from "./types";

export const NAME_MAX_LENGTH = 32;
export const LOGO_TEXT_MAX_LENGTH = 3;

export interface NewGameParams {
  archetype: CeoArchetypeId;
  logo: Logo;
  companyName: string;
  ceoName: string;
}

export type NewGameErrors = Partial<Record<"companyName" | "ceoName" | "logoText", string>>;

export function validateNewGame(params: NewGameParams): NewGameErrors {
  const errors: NewGameErrors = {};
  const company = params.companyName.trim();
  const ceo = params.ceoName.trim();
  const logoText = params.logo.text.trim();

  if (!company) errors.companyName = "Enter a company name.";
  else if (company.length > NAME_MAX_LENGTH)
    errors.companyName = `Company name must be ${NAME_MAX_LENGTH} characters or fewer.`;

  if (!ceo) errors.ceoName = "Enter a CEO name.";
  else if (ceo.length > NAME_MAX_LENGTH)
    errors.ceoName = `CEO name must be ${NAME_MAX_LENGTH} characters or fewer.`;

  if (!logoText) errors.logoText = "Enter 1–3 characters for the logo.";
  else if (logoText.length > LOGO_TEXT_MAX_LENGTH)
    errors.logoText = `Logo text must be ${LOGO_TEXT_MAX_LENGTH} characters or fewer.`;

  return errors;
}

/** Up to three initials from a company name, e.g. "Silicon Valley Works" → "SVW". */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, LOGO_TEXT_MAX_LENGTH)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Fills in every system of a game (employees, research, market, money).
 * Used for new games and to upgrade version-1 saves.
 */
export function initSystems(
  base: Pick<GameState, "id" | "seed" | "rngState" | "week" | "company" | "ceo" | "events">,
): GameState {
  const s: GameState = {
    ...base,
    company: { ...base.company, reputation: STARTING_REPUTATION },
    nextId: 1,
    employees: [],
    candidates: [],
    nextCandidatesWeek: base.week + CANDIDATE_REFRESH_WEEKS,
    research: { completed: [...STARTING_RESEARCH], progress: {}, current: null },
    products: [],
    fabOrders: [],
    rivals: [],
    rivalProducts: [],
    contracts: [],
    nextContractWeek: base.week + 3,
    clientRelations: {},
    investors: {
      goodwill: STARTING_GOODWILL,
      expectation: FIRST_YEAR_EXPECTATION,
      founderShares: Math.round(TOTAL_SHARES * FOUNDER_SHARE_FRACTION),
      investorShares: Math.round(TOTAL_SHARES * (1 - FOUNDER_SHARE_FRACTION)),
      lastIssueYear: null,
    },
    bank: { creditScore: STARTING_CREDIT_SCORE, loans: [], negativeCashWeeks: 0 },
    ledger: emptyLedger(),
    lastLedger: null,
    weekNet: 0,
    weeklyProfits: [],
    sharePrice: 0,
    history: [],
    years: [],
    achievements: [],
    gameOver: null,
  };
  refreshCandidates(s);
  initRivals(s);
  s.sharePrice = computeSharePrice(s);
  s.history.push({ week: s.week, cash: s.company.cash, sharePrice: s.sharePrice });
  return s;
}

/**
 * Creates a new game. `id` and `seed` are passed in rather than generated
 * here so the sim stays deterministic and free of platform APIs.
 */
export function createNewGame(params: NewGameParams, options: { id: string; seed: number }): GameState {
  const errors = validateNewGame(params);
  if (Object.keys(errors).length > 0) {
    throw new Error(`Invalid new game parameters: ${Object.values(errors).join(" ")}`);
  }
  const companyName = params.companyName.trim();
  const s = initSystems({
    id: options.id,
    seed: options.seed,
    rngState: seedToState(options.seed),
    week: 0,
    company: {
      name: companyName,
      logo: { ...params.logo, text: params.logo.text.trim().toUpperCase() },
      cash: STARTING_CASH,
      reputation: STARTING_REPUTATION,
    },
    ceo: { name: params.ceoName.trim(), archetype: params.archetype },
    events: [{ week: 0, message: `${companyName} is founded on ${formatDate(0)}.` }],
  });
  unlockAchievement(s, "company_founded");
  return s;
}

/** Advances the game by one week. Returns a new state; the input is not changed. */
export function tick(state: GameState): GameState {
  if (state.gameOver) return state;
  const s = structuredClone(state);
  const prevYear = calendarYear(s.week);
  s.week += 1;

  const year = calendarYear(s.week);
  if (year !== prevYear) {
    // Close the books on the old year before this week's money moves.
    yearEnd(s, prevYear, teamOutput(s, BASE_TAX_RATE).taxRate);
    yearlyGrowth(s);
    addEvent(s, `The year ${year} begins.`);
    if (s.gameOver) return s;
  }

  const out = teamOutput(s, BASE_TAX_RATE);
  updateHappiness(s, out.hrHappiness);
  progressResearch(s, out.researchPerWeek);
  progressDesign(s, out.designPerWeek);
  deliverFabOrders(s);
  updateRivals(s);

  const sales = runMarketWeek(s, out.marketing, out.retailCut);
  driftReputation(s, sales.playerShare);
  if (sales.revenue > 0) {
    earn(s, "salesRevenue", sales.revenue);
    unlockAchievement(s, "first_cpu_shipped");
  }

  updateContracts(s);

  chargeExpense(s, "salaries", weeklySalaries(s));
  chargeExpense(
    s,
    "office",
    Math.round((OFFICE_BASE_WEEKLY + OFFICE_PER_EMPLOYEE_WEEKLY * s.employees.length) * wageIndex(s.week)),
  );
  weeklyBank(s, out.creditDrift);

  if (s.week >= s.nextCandidatesWeek) {
    refreshCandidates(s);
    s.nextCandidatesWeek = s.week + CANDIDATE_REFRESH_WEEKS;
  }

  closeWeek(s);
  return s;
}

export { addEvent };
