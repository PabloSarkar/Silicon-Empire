// Core game state types. This folder must stay free of React and browser APIs
// (README §5, rule 3) so it can run in the browser, in Electron and in
// headless balance tests.
//
// Any change to GameState needs a SAVE_VERSION bump and a migration in
// src/save/saveFile.ts (AGENTS.md rule 11).

import type { EmployeeType, StatId } from "../data/employees";
import type { SegmentId } from "../data/market";

export type CeoArchetypeId = "research" | "technical" | "business" | "marketing";

export type LogoShape = "circle" | "square" | "diamond" | "hexagon" | "triangle";
export type LogoFont = "sans" | "serif" | "mono";

export interface Logo {
  shape: LogoShape;
  /** Fill colour of the shape, as a #rrggbb hex string. */
  primaryColor: string;
  /** Colour of the text, as a #rrggbb hex string. */
  secondaryColor: string;
  font: LogoFont;
  /** 1–3 characters shown on the logo, usually the company initials. */
  text: string;
}

export interface Company {
  name: string;
  logo: Logo;
  /** Cash on hand in US dollars. */
  cash: number;
  /** Public reputation, 0–100. */
  reputation: number;
}

export interface Ceo {
  name: string;
  archetype: CeoArchetypeId;
}

export interface GameEvent {
  /** In-game week the event happened. */
  week: number;
  message: string;
  /** Important events can pause the game (setting) and are highlighted. */
  important?: boolean;
}

// --- Employees ---------------------------------------------------------------

export type Stats = Record<StatId, number>;

export interface Candidate {
  id: string;
  name: string;
  type: EmployeeType;
  stats: Stats;
  /** Weekly salary in US dollars. */
  salary: number;
}

export interface Employee extends Candidate {
  /** 0–100. Affects productivity; very unhappy employees may quit. */
  happiness: number;
  hiredWeek: number;
}

// --- Research ----------------------------------------------------------------

export interface ResearchState {
  /** Ids of finished research tiers. */
  completed: string[];
  /** Research points put into unfinished tiers (progress is kept when switching). */
  progress: Record<string, number>;
  /** Tier being researched, if any. */
  current: string | null;
}

// --- Chips and products ------------------------------------------------------

export interface CpuSpec {
  name: string;
  nodeId: string;
  /** Data-width tier (e.g. "arch-16bit"). */
  widthId: string;
  /** Researched feature tiers included in this design. */
  features: string[];
  socketId: string;
  cores: number;
  clockMHz: number;
}

/** Values derived from a CpuSpec and the company's power/thermal tech. */
export interface CpuStats {
  transistorsM: number;
  dieAreaMm2: number;
  /** Performance in MIPS. */
  perf: number;
  powerW: number;
  tempC: number;
  /** Share of dies that work, 0–1. */
  yield: number;
  /** Raw cost per good chip before the fab's markup. */
  rawUnitCost: number;
  /** Design points needed to finish the design. */
  designPoints: number;
  /** Mask and tooling cost, paid when design starts. */
  maskCost: number;
}

export type ProductStatus = "development" | "ready" | "onSale" | "discontinued";

export interface AnalystReview {
  /** 0–10. */
  score: number;
  notes: string[];
}

export interface Product {
  id: string;
  spec: CpuSpec;
  stats: CpuStats;
  status: ProductStatus;
  designProgress: number;
  createdWeek: number;
  completedWeek: number | null;
  launchedWeek: number | null;
  discontinuedWeek: number | null;
  /** Retail price in US dollars. */
  price: number;
  inventory: number;
  unitsSold: number;
  /** Revenue after the retail cut, including contract sales. */
  revenue: number;
  productionCost: number;
  contractUnits: number;
  lastWeekSales: number;
  review: AnalystReview | null;
}

export interface FabOrder {
  id: string;
  productId: string;
  fabId: string;
  quantity: number;
  goodUnits: number;
  cost: number;
  orderedWeek: number;
  deliveryWeek: number;
}

// --- Market ------------------------------------------------------------------

export interface RivalProduct {
  id: string;
  rivalId: string;
  name: string;
  segment: SegmentId;
  perf: number;
  powerW: number;
  price: number;
  launchedWeek: number;
  /** Units sold last week (for market share display). */
  lastWeekSales: number;
}

export interface RivalState {
  id: string;
  nextReleaseWeek: number;
  releases: number;
}

// --- Contracts ---------------------------------------------------------------

export type ContractStatus = "open" | "bidding" | "active" | "completed" | "failed" | "expired" | "lost";

export interface Contract {
  id: string;
  clientId: string;
  units: number;
  /** Minimum performance (MIPS). */
  minPerf: number;
  maxPowerW: number;
  maxTempC: number;
  /** Weeks to deliver after winning. */
  durationWeeks: number;
  pricePerUnit: number;
  /** Paid if the deadline is missed. */
  penalty: number;
  status: ContractStatus;
  offeredWeek: number;
  /** Week an open offer disappears. */
  expiresWeek: number;
  /** Chance of winning, fixed when the bid is placed. */
  winChance: number | null;
  bidWeek: number | null;
  deadlineWeek: number | null;
  resolvedWeek: number | null;
  productId: string | null;
  /** Amount actually paid on delivery. */
  paid: number | null;
}

// --- Money -------------------------------------------------------------------

export interface Ledger {
  salesRevenue: number;
  contractRevenue: number;
  production: number;
  salaries: number;
  research: number;
  design: number;
  office: number;
  hiring: number;
  interest: number;
  penalties: number;
  tax: number;
}

export interface Loan {
  id: string;
  principal: number;
  balance: number;
  aprPct: number;
  termWeeks: number;
  weeklyPayment: number;
  takenWeek: number;
}

export interface YearRecord {
  year: number;
  revenue: number;
  expenses: number;
  preTaxProfit: number;
  tax: number;
  netProfit: number;
  expectation: number;
  met: boolean;
  reward: number;
  goodwillChange: number;
}

export interface HistoryPoint {
  week: number;
  cash: number;
  sharePrice: number;
}

export interface InvestorState {
  /** 0–100. At 0 the board replaces the CEO. */
  goodwill: number;
  /** Net profit the board expects this year. */
  expectation: number;
  founderShares: number;
  investorShares: number;
  lastIssueYear: number | null;
}

export interface BankState {
  /** 300–850. */
  creditScore: number;
  loans: Loan[];
  /** Consecutive weeks ending with negative cash. */
  negativeCashWeeks: number;
}

export interface GameOver {
  reason: string;
  week: number;
}

// --- Whole game --------------------------------------------------------------

export interface GameState {
  /** Unique id of this playthrough; used to name save slots. */
  id: string;
  /** Seed the game was started with (kept for bug reports). */
  seed: number;
  /** Current state of the seeded random number generator (D-009). */
  rngState: number;
  /** Counter for deterministic ids of things created in the game. */
  nextId: number;
  /** Weeks elapsed since the start date (week 0 = 1 Jan 1975). */
  week: number;
  company: Company;
  ceo: Ceo;
  /** Newest last. Capped at MAX_EVENTS entries. */
  events: GameEvent[];

  employees: Employee[];
  candidates: Candidate[];
  nextCandidatesWeek: number;

  research: ResearchState;
  products: Product[];
  fabOrders: FabOrder[];

  rivals: RivalState[];
  rivalProducts: RivalProduct[];

  contracts: Contract[];
  nextContractWeek: number;
  /** Relationship with each client, −100 to 100. */
  clientRelations: Record<string, number>;

  investors: InvestorState;
  bank: BankState;
  /** Income and costs of the current calendar year. */
  ledger: Ledger;
  /** Ledger of the previous calendar year, if any. */
  lastLedger: Ledger | null;
  /** Revenue minus costs so far this week (reset when the week closes). */
  weekNet: number;
  /** Net cash result of each of the last 52 weeks (newest last), for the share price. */
  weeklyProfits: number[];
  sharePrice: number;
  /** Sampled every 4 weeks. */
  history: HistoryPoint[];
  years: YearRecord[];

  /** Achievement ids reached in this game (the UI forwards new ones to the platform). */
  achievements: string[];
  gameOver: GameOver | null;
}
