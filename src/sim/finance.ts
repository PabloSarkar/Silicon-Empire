// Money: ledger, bank loans and credit score, share price, investors and the
// year-end review (README §2.7, §2.8).

import { getArchetype } from "../data/archetypes";
import { BANKRUPTCY_WEEKS, SHARE_ISSUE_FRACTION } from "../data/balance";
import { marketUnitsPerWeek } from "../data/market";
import { addEvent, unlockAchievement } from "./events";
import { clamp } from "./random";
import type { GameState, Ledger, Loan, YearRecord } from "./types";

export type RevenueKey = "salesRevenue" | "contractRevenue";
export type ExpenseKey = Exclude<keyof Ledger, RevenueKey>;

export function emptyLedger(): Ledger {
  return {
    salesRevenue: 0,
    contractRevenue: 0,
    production: 0,
    salaries: 0,
    research: 0,
    design: 0,
    office: 0,
    hiring: 0,
    interest: 0,
    penalties: 0,
    tax: 0,
  };
}

export const EXPENSE_LABELS: Record<ExpenseKey, string> = {
  production: "Production",
  salaries: "Salaries",
  research: "Research",
  design: "Chip design (masks)",
  office: "Office",
  hiring: "Hiring and severance",
  interest: "Loan interest",
  penalties: "Contract penalties",
  tax: "Tax",
};

export function ledgerRevenue(l: Ledger): number {
  return l.salesRevenue + l.contractRevenue;
}

/** All costs except tax. */
export function ledgerCosts(l: Ledger): number {
  return l.production + l.salaries + l.research + l.design + l.office + l.hiring + l.interest + l.penalties;
}

export function earn(s: GameState, key: RevenueKey, amount: number): void {
  s.company.cash += amount;
  s.ledger[key] += amount;
  s.weekNet += amount;
}

export function chargeExpense(s: GameState, key: ExpenseKey, amount: number): void {
  s.company.cash -= amount;
  s.ledger[key] += amount;
  s.weekNet -= amount;
}

/** Index of how big the market is compared with 1975. */
export function marketIndex(week: number): number {
  return marketUnitsPerWeek(week) / marketUnitsPerWeek(0);
}

// --- Bank --------------------------------------------------------------------

export function totalDebt(s: GameState): number {
  return s.bank.loans.reduce((sum, l) => sum + l.balance, 0);
}

export function maxLoanAmount(s: GameState): number {
  const fromScore = Math.max(0, s.bank.creditScore - 500) * 1500 * marketIndex(s.week);
  const fromIncome = Math.max(0, s.weeklyProfits.reduce((a, b) => a + b, 0)) * 0.5;
  return Math.max(0, Math.round((fromScore + fromIncome - totalDebt(s)) / 1000) * 1000);
}

export interface LoanQuote {
  amount: number;
  termYears: number;
  aprPct: number;
  weeklyPayment: number;
  totalRepaid: number;
  /** Credit score drop from taking the loan (longer loans cost more). */
  scoreHit: number;
}

export function loanQuote(s: GameState, amount: number, termYears: number): LoanQuote {
  const aprPct = Math.round((7 + (750 - s.bank.creditScore) / 40 + 0.4 * termYears) * 10) / 10;
  const r = aprPct / 100 / 52;
  const n = termYears * 52;
  const weeklyPayment = amount > 0 ? (amount * r) / (1 - Math.pow(1 + r, -n)) : 0;
  return {
    amount,
    termYears,
    aprPct: Math.max(3, aprPct),
    weeklyPayment: Math.round(weeklyPayment * 100) / 100,
    totalRepaid: Math.round(weeklyPayment * n),
    scoreHit: 5 + 4 * termYears,
  };
}

export function weeklyBank(s: GameState, creditDrift: number): void {
  for (const loan of [...s.bank.loans]) {
    const interest = (loan.balance * loan.aprPct) / 100 / 52;
    const payment = Math.min(loan.weeklyPayment, loan.balance + interest);
    chargeExpense(s, "interest", interest);
    // Principal is a repayment of borrowed cash, not an expense.
    s.company.cash -= payment - interest;
    loan.balance = Math.max(0, loan.balance - (payment - interest));
    if (loan.balance < 0.01) {
      s.bank.loans = s.bank.loans.filter((l) => l.id !== loan.id);
      s.bank.creditScore += 10;
      addEvent(s, "A bank loan has been fully repaid.", true);
    } else {
      s.bank.creditScore += 0.05;
    }
  }

  if (s.company.cash < 0) {
    s.bank.negativeCashWeeks += 1;
    s.bank.creditScore -= 3;
    if (s.bank.negativeCashWeeks === 1) {
      addEvent(s, `Cash is negative. Fix it within ${BANKRUPTCY_WEEKS} weeks or the company goes bankrupt.`, true);
    }
  } else {
    s.bank.negativeCashWeeks = 0;
    s.bank.creditScore += creditDrift;
  }
  s.bank.creditScore = clamp(s.bank.creditScore, 300, 850);

  if (s.bank.negativeCashWeeks >= BANKRUPTCY_WEEKS) {
    s.gameOver = { reason: `Bankrupt: cash stayed negative for ${BANKRUPTCY_WEEKS} weeks.`, week: s.week };
    addEvent(s, "The company is bankrupt.", true);
  }
}

export function repayLoanEarly(s: GameState, loan: Loan): void {
  s.company.cash -= loan.balance;
  s.bank.loans = s.bank.loans.filter((l) => l.id !== loan.id);
  s.bank.creditScore = clamp(s.bank.creditScore + 5, 300, 850);
}

// --- Shares and investors ----------------------------------------------------

export function totalShares(s: GameState): number {
  return s.investors.founderShares + s.investors.investorShares;
}

export function computeSharePrice(s: GameState): number {
  const profit52 = s.weeklyProfits.reduce((a, b) => a + b, 0);
  const valuation = Math.max(
    20_000,
    s.company.cash - totalDebt(s) + 8 * Math.max(0, profit52) + 5_000 * s.company.reputation * marketIndex(s.week),
  );
  return Math.round((valuation / totalShares(s)) * 100) / 100;
}

/** Call once at the end of each week, after all cash movements. */
export function closeWeek(s: GameState): void {
  s.weeklyProfits.push(s.weekNet);
  if (s.weeklyProfits.length > 52) s.weeklyProfits.shift();
  s.weekNet = 0;
  s.sharePrice = computeSharePrice(s);
  if (s.week % 4 === 0) {
    s.history.push({ week: s.week, cash: Math.round(s.company.cash), sharePrice: s.sharePrice });
  }
  if (s.company.cash >= 1_000_000) unlockAchievement(s, "millionaire");
}

export function shareIssueQuote(s: GameState): { shares: number; cash: number } {
  const shares = Math.round(totalShares(s) * SHARE_ISSUE_FRACTION);
  return { shares, cash: Math.round(shares * s.sharePrice * 0.9) };
}

/**
 * Next year's target: halfway between this year's result and this year's
 * target, grown by half the market's growth plus 3%.
 */
export function nextExpectation(netProfit: number, previous: number, week: number): number {
  const floor = 50_000 * Math.sqrt(marketIndex(week));
  const marketGrowth = marketUnitsPerWeek(week + 52) / marketUnitsPerWeek(week);
  const base = 0.5 * Math.max(0, netProfit) + 0.5 * Math.max(0, previous);
  return Math.round(Math.max(floor, base * (1 + 0.5 * (marketGrowth - 1) + 0.03)) / 1000) * 1000;
}

/** Year-end: tax, investor review, new expectation. `year` is the year that just ended. */
export function yearEnd(s: GameState, year: number, taxRate: number): void {
  const mods = getArchetype(s.ceo.archetype).modifiers;
  const investorBonus = mods.investorReputation ?? 0;
  const ledger = s.ledger;
  const revenue = ledgerRevenue(ledger);
  const expenses = ledgerCosts(ledger);
  const preTaxProfit = revenue - expenses;
  const tax = preTaxProfit > 0 ? Math.round(preTaxProfit * taxRate) : 0;
  if (tax > 0) chargeExpense(s, "tax", tax);
  const netProfit = preTaxProfit - tax;

  const expectation = s.investors.expectation;
  const met = netProfit >= expectation;
  let reward = 0;
  let goodwillChange: number;
  if (met) {
    reward = Math.round((0.2 * (netProfit - expectation) + 20_000 * marketIndex(s.week)) / 1000) * 1000;
    const excess = (netProfit - expectation) / Math.max(Math.abs(expectation), 100_000);
    goodwillChange = Math.round((8 + 7 * Math.min(1, excess)) * (1 + investorBonus));
    s.company.cash += reward; // Financing income, not part of profit.
  } else {
    const shortfall = (expectation - netProfit) / Math.max(Math.abs(expectation), 100_000);
    goodwillChange = -Math.round((5 + 25 * Math.min(1, shortfall)) * (1 - investorBonus));
  }
  s.investors.goodwill = clamp(s.investors.goodwill + goodwillChange, 0, 100);

  const record: YearRecord = {
    year,
    revenue,
    expenses: expenses + tax,
    preTaxProfit,
    tax,
    netProfit,
    expectation,
    met,
    reward,
    goodwillChange,
  };
  s.years.push(record);
  s.lastLedger = { ...ledger };
  s.ledger = emptyLedger();
  s.investors.expectation = nextExpectation(netProfit, expectation, s.week);

  const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
  if (met) {
    addEvent(s, `${year} results: net profit ${money(netProfit)} beat the board's target of ${money(expectation)}. The board paid a ${money(reward)} bonus. Goodwill +${goodwillChange}.`, true);
  } else {
    addEvent(s, `${year} results: net profit ${money(netProfit)} missed the board's target of ${money(expectation)}. Goodwill ${goodwillChange}.`, true);
  }
  addEvent(s, `The board expects a net profit of ${money(s.investors.expectation)} in ${year + 1}.`);
  if (netProfit > 0) unlockAchievement(s, "first_profitable_year");

  if (s.investors.goodwill <= 0) {
    s.gameOver = { reason: "The board lost confidence and replaced you as CEO.", week: s.week };
    addEvent(s, "The board has replaced you as CEO.", true);
  }
}
