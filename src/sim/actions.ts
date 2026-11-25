// Player actions. Each takes a state and returns a new one (the input is
// never mutated). Invalid actions throw ActionError with a message for the
// player.

import { BASE_TAX_RATE, HIRING_FEE_WEEKS, LOAN_TERMS_YEARS, MAX_LOANS, SEVERANCE_WEEKS } from "../data/balance";
import { getEmployeeType } from "../data/employees";
import { getClient } from "../data/market";
import { getResearchNode, researchCashCost } from "../data/research";
import { calendarYear } from "./calendar";
import { changeRelation, changeReputation, meetsContract, winChance } from "./contracts";
import { evaluateDesign, techFrom, validateSpec } from "./cpu";
import { teamOutput } from "./employees";
import { addEvent, unlockAchievement } from "./events";
import {
  chargeExpense,
  earn,
  loanQuote,
  maxLoanAmount,
  repayLoanEarly,
  shareIssueQuote,
} from "./finance";
import { analystReview } from "./market";
import { fabQuote } from "./production";
import { newId } from "./random";
import { researchStatus } from "./research";
import type { CpuSpec, GameState, Product } from "./types";

export class ActionError extends Error {}

function fail(message: string): never {
  throw new ActionError(message);
}

/** Runs `change` on a copy of the state. */
function act(state: GameState, change: (s: GameState) => void): GameState {
  if (state.gameOver) fail("The game is over.");
  const s = structuredClone(state);
  change(s);
  return s;
}

function product(s: GameState, id: string): Product {
  return s.products.find((p) => p.id === id) ?? fail("That product no longer exists.");
}

function money(n: number): string {
  return `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
}

// --- Research ----------------------------------------------------------------

export function startResearch(state: GameState, id: string): GameState {
  return act(state, (s) => {
    const status = researchStatus(s, id);
    const node = getResearchNode(id);
    if (status === "done") fail(`${node.name} is already researched.`);
    if (status === "current") return;
    if (status === "lockedPrereq") fail("Research the previous tier in this category first.");
    if (status === "lockedYear") fail(`${node.name} becomes available in ${node.year}.`);
    // Cash is paid once, the first time a tier is started.
    if (!(id in s.research.progress)) {
      const cost = researchCashCost(node);
      if (cost > s.company.cash) fail(`Starting this research costs ${money(cost)}.`);
      chargeExpense(s, "research", cost);
      s.research.progress[id] = 0;
    }
    s.research.current = id;
  });
}

export function stopResearch(state: GameState): GameState {
  return act(state, (s) => {
    s.research.current = null;
  });
}

// --- Design and products -----------------------------------------------------

export function startDesign(state: GameState, spec: CpuSpec): GameState {
  return act(state, (s) => {
    if (s.products.some((p) => p.status === "development")) {
      fail("Your team can only develop one chip at a time.");
    }
    const errors = validateSpec(spec, s.research.completed);
    if (errors.length > 0) fail(errors.join(" "));
    const clean: CpuSpec = { ...spec, name: spec.name.trim(), features: [...spec.features] };
    const stats = evaluateDesign(clean, techFrom(s.research.completed));
    if (stats.maskCost > s.company.cash) fail(`Masks and tooling cost ${money(stats.maskCost)}.`);
    chargeExpense(s, "design", stats.maskCost);
    s.products.push({
      id: newId(s, "p"),
      spec: clean,
      stats,
      status: "development",
      designProgress: 0,
      createdWeek: s.week,
      completedWeek: null,
      launchedWeek: null,
      discontinuedWeek: null,
      price: 0,
      inventory: 0,
      unitsSold: 0,
      revenue: 0,
      productionCost: 0,
      contractUnits: 0,
      lastWeekSales: 0,
      review: null,
    });
    addEvent(s, `Started designing ${clean.name}.`);
  });
}

export function cancelDesign(state: GameState, productId: string): GameState {
  return act(state, (s) => {
    const p = product(s, productId);
    if (p.status !== "development") fail("Only designs in development can be cancelled.");
    s.products = s.products.filter((x) => x.id !== productId);
    addEvent(s, `Cancelled the ${p.spec.name} design.`);
  });
}

function checkPrice(price: number): void {
  if (!Number.isFinite(price) || price < 1 || price > 100_000) fail("Price must be between $1 and $100,000.");
}

export function launchProduct(state: GameState, productId: string, price: number): GameState {
  return act(state, (s) => {
    const p = product(s, productId);
    if (p.status !== "ready") fail("Only finished designs that are not on sale can be launched.");
    checkPrice(price);
    p.price = Math.round(price);
    p.status = "onSale";
    p.launchedWeek = s.week;
    const out = teamOutput(s, BASE_TAX_RATE);
    p.review = analystReview(s, p, out.marketing);
    if (p.review.score >= 8) changeReputation(s, 2);
    else if (p.review.score <= 4) changeReputation(s, -3);
    addEvent(s, `Launched ${p.spec.name} at ${money(p.price)}. Analysts rate it ${p.review.score}/10.`, true);
    unlockAchievement(s, "first_cpu_launched");
  });
}

export function setPrice(state: GameState, productId: string, price: number): GameState {
  return act(state, (s) => {
    const p = product(s, productId);
    if (p.status !== "onSale") fail("Only products on sale have a price.");
    checkPrice(price);
    p.price = Math.round(price);
  });
}

export function discontinueProduct(state: GameState, productId: string): GameState {
  return act(state, (s) => {
    const p = product(s, productId);
    if (p.status !== "onSale" && p.status !== "ready") fail("This product can't be discontinued.");
    p.status = "discontinued";
    p.discontinuedWeek = s.week;
    addEvent(s, `Discontinued ${p.spec.name}. Remaining stock can still go to contracts.`);
  });
}

// --- Production --------------------------------------------------------------

export function orderProduction(state: GameState, productId: string, fabId: string, quantity: number): GameState {
  return act(state, (s) => {
    const p = product(s, productId);
    const out = teamOutput(s, BASE_TAX_RATE);
    const quote = fabQuote(s, p, fabId, quantity, out.production);
    if (quote.problems.length > 0) fail(quote.problems.join(" "));
    chargeExpense(s, "production", quote.totalCost);
    p.productionCost += quote.totalCost;
    s.fabOrders.push({
      id: newId(s, "o"),
      productId,
      fabId,
      quantity: quote.quantity,
      goodUnits: quote.goodUnits,
      cost: quote.totalCost,
      orderedWeek: s.week,
      deliveryWeek: s.week + quote.leadWeeks,
    });
    addEvent(s, `Ordered ${quote.quantity.toLocaleString("en-US")} ${p.spec.name} chips from ${quote.fab.name} (${money(quote.totalCost)}, ${quote.leadWeeks} weeks).`);
  });
}

// --- Employees ---------------------------------------------------------------

export function hireCandidate(state: GameState, candidateId: string): GameState {
  return act(state, (s) => {
    const c = s.candidates.find((x) => x.id === candidateId) ?? fail("That candidate is no longer available.");
    const fee = c.salary * HIRING_FEE_WEEKS;
    if (fee > s.company.cash) fail(`Hiring costs ${money(fee)} up front.`);
    chargeExpense(s, "hiring", fee);
    s.candidates = s.candidates.filter((x) => x.id !== candidateId);
    s.employees.push({ ...c, happiness: 70, hiredWeek: s.week });
    addEvent(s, `Hired ${c.name} as a ${getEmployeeType(c.type).name}.`);
    if (s.employees.length >= 10) unlockAchievement(s, "team_of_ten");
  });
}

export function fireEmployee(state: GameState, employeeId: string): GameState {
  return act(state, (s) => {
    const e = s.employees.find((x) => x.id === employeeId) ?? fail("That employee no longer works here.");
    chargeExpense(s, "hiring", e.salary * SEVERANCE_WEEKS);
    s.employees = s.employees.filter((x) => x.id !== employeeId);
    for (const other of s.employees) other.happiness = Math.max(0, other.happiness - 3);
    addEvent(s, `Let ${e.name} go.`);
  });
}

// --- Contracts ---------------------------------------------------------------

export function bidContract(state: GameState, contractId: string): GameState {
  return act(state, (s) => {
    const c = s.contracts.find((x) => x.id === contractId) ?? fail("That offer has expired.");
    if (c.status !== "open") fail("You can only bid on open offers.");
    const out = teamOutput(s, BASE_TAX_RATE);
    c.status = "bidding";
    c.bidWeek = s.week;
    c.winChance = winChance(s, c, out.negotiation);
    addEvent(s, `Bid on the ${getClient(c.clientId).name} contract. The answer comes next week.`);
  });
}

export function deliverContract(state: GameState, contractId: string, productId: string): GameState {
  return act(state, (s) => {
    const c = s.contracts.find((x) => x.id === contractId) ?? fail("That contract no longer exists.");
    if (c.status !== "active") fail("Only won, active contracts can be delivered.");
    const p = product(s, productId);
    if (p.status === "development") fail("That design isn't finished.");
    if (!meetsContract(p.stats, c).all) fail(`${p.spec.name} doesn't meet the contract's requirements.`);
    if (p.inventory < c.units) fail(`You need ${c.units.toLocaleString("en-US")} chips in stock; you have ${p.inventory.toLocaleString("en-US")}.`);
    const out = teamOutput(s, BASE_TAX_RATE);
    const paid = Math.round(c.units * c.pricePerUnit * (1 + out.contractMargin));
    p.inventory -= c.units;
    p.contractUnits += c.units;
    p.unitsSold += c.units;
    p.revenue += paid;
    earn(s, "contractRevenue", paid);
    c.status = "completed";
    c.resolvedWeek = s.week;
    c.productId = p.id;
    c.paid = paid;
    changeReputation(s, 1);
    changeRelation(s, c.clientId, 10);
    addEvent(s, `Delivered ${c.units.toLocaleString("en-US")} ${p.spec.name} chips to ${getClient(c.clientId).name} for ${money(paid)}.`, true);
    unlockAchievement(s, "first_contract");
  });
}

// --- Bank and investors ------------------------------------------------------

export function takeLoan(state: GameState, amount: number, termYears: number): GameState {
  return act(state, (s) => {
    if (!LOAN_TERMS_YEARS.includes(termYears as (typeof LOAN_TERMS_YEARS)[number])) fail("Choose a valid loan term.");
    if (s.bank.loans.length >= MAX_LOANS) fail(`You can have at most ${MAX_LOANS} loans at once.`);
    const max = maxLoanAmount(s);
    if (!Number.isFinite(amount) || amount < 1000) fail("Borrow at least $1,000.");
    if (amount > max) fail(`The bank will lend at most ${money(max)}.`);
    const q = loanQuote(s, Math.round(amount), termYears);
    s.company.cash += q.amount;
    s.bank.loans.push({
      id: newId(s, "l"),
      principal: q.amount,
      balance: q.amount,
      aprPct: q.aprPct,
      termWeeks: termYears * 52,
      weeklyPayment: q.weeklyPayment,
      takenWeek: s.week,
    });
    s.bank.creditScore = Math.max(300, s.bank.creditScore - q.scoreHit);
    addEvent(s, `Borrowed ${money(q.amount)} over ${termYears} year${termYears > 1 ? "s" : ""} at ${q.aprPct}% APR.`);
  });
}

export function repayLoan(state: GameState, loanId: string): GameState {
  return act(state, (s) => {
    const loan = s.bank.loans.find((l) => l.id === loanId) ?? fail("That loan no longer exists.");
    if (loan.balance > s.company.cash) fail(`Repaying needs ${money(loan.balance)} in cash.`);
    repayLoanEarly(s, loan);
    addEvent(s, `Repaid a loan early (${money(loan.balance)}).`);
  });
}

export function issueShares(state: GameState): GameState {
  return act(state, (s) => {
    const year = calendarYear(s.week);
    if (s.investors.lastIssueYear === year) fail("You can issue new shares once per year.");
    if (s.investors.goodwill < 20) fail("The board won't approve a share issue with goodwill this low.");
    const q = shareIssueQuote(s);
    s.investors.investorShares += q.shares;
    s.investors.lastIssueYear = year;
    s.investors.goodwill = Math.max(0, s.investors.goodwill - 3);
    s.company.cash += q.cash;
    addEvent(s, `Sold ${q.shares.toLocaleString("en-US")} new shares to investors for ${money(q.cash)}. Your stake is diluted.`);
  });
}

