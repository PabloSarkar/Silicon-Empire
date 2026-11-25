// Contracts from client companies (README §2.9).

import { getArchetype } from "../data/archetypes";
import { MAX_OPEN_OFFERS } from "../data/balance";
import { CLIENTS, getClient, marketUnitsPerWeek } from "../data/market";
import { referenceDesign } from "./cpu";
import { addEvent } from "./events";
import { chargeExpense } from "./finance";
import { chance, clamp, newId, pick, randInt, uniform } from "./random";
import type { Contract, CpuStats, GameState } from "./types";

/** Rounds to 2 significant figures so requirements read cleanly. */
function round2sf(x: number): number {
  if (x <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / magnitude) * magnitude;
}

export function generateOffer(s: GameState): Contract {
  const client = pick(s, CLIENTS);
  const ref = referenceDesign(s.week, 1, { clockFrac: 0.85, coreFrac: 0.5 });
  const units = Math.max(200, Math.round((marketUnitsPerWeek(s.week) * uniform(s, 0.2, 1)) / 100) * 100);
  const pricePerUnit = Math.round(150 * uniform(s, 0.5, 1.2) * (0.6 + 0.4 * client.perfDemand));
  return {
    id: newId(s, "k"),
    clientId: client.id,
    units,
    minPerf: round2sf(ref.stats.perf * uniform(s, 0.25, 0.9) * client.perfDemand),
    maxPowerW: Math.max(0.5, Math.round(ref.stats.powerW * uniform(s, 1, 2) * client.powerStrictness * 10) / 10),
    maxTempC: 5 * randInt(s, 14, 18),
    durationWeeks: randInt(s, 14, 30),
    pricePerUnit,
    penalty: Math.round((units * pricePerUnit * 0.25) / 100) * 100,
    status: "open",
    offeredWeek: s.week,
    expiresWeek: s.week + randInt(s, 4, 8),
    winChance: null,
    bidWeek: null,
    deadlineWeek: null,
    resolvedWeek: null,
    productId: null,
    paid: null,
  };
}

export function winChance(s: GameState, contract: Contract, negotiation: number): number {
  const relation = s.clientRelations[contract.clientId] ?? 0;
  return clamp(0.3 + s.company.reputation / 250 + negotiation + relation / 400, 0.05, 0.95);
}

export function meetsContract(stats: CpuStats, c: Contract): { perf: boolean; power: boolean; temp: boolean; all: boolean } {
  const perf = stats.perf >= c.minPerf;
  const power = stats.powerW <= c.maxPowerW;
  const temp = stats.tempC <= c.maxTempC;
  return { perf, power, temp, all: perf && power && temp };
}

export function changeReputation(s: GameState, delta: number): void {
  const mods = getArchetype(s.ceo.archetype).modifiers;
  const scaled = delta > 0 ? delta * (1 + (mods.companyReputation ?? 0)) : delta;
  s.company.reputation = clamp(s.company.reputation + scaled, 0, 100);
}

function changeRelation(s: GameState, clientId: string, delta: number): void {
  s.clientRelations[clientId] = clamp((s.clientRelations[clientId] ?? 0) + delta, -100, 100);
}

export function updateContracts(s: GameState): void {
  for (const c of s.contracts) {
    const client = getClient(c.clientId);
    if (c.status === "open" && s.week >= c.expiresWeek) {
      c.status = "expired";
      c.resolvedWeek = s.week;
    } else if (c.status === "bidding" && c.bidWeek !== null && s.week > c.bidWeek) {
      if (chance(s, c.winChance ?? 0)) {
        c.status = "active";
        c.deadlineWeek = s.week + c.durationWeeks;
        addEvent(s, `Won the ${client.name} contract: deliver ${c.units.toLocaleString("en-US")} chips within ${c.durationWeeks} weeks.`, true);
      } else {
        c.status = "lost";
        c.resolvedWeek = s.week;
        addEvent(s, `Lost the bid for the ${client.name} contract.`);
      }
    } else if (c.status === "active" && c.deadlineWeek !== null && s.week > c.deadlineWeek) {
      c.status = "failed";
      c.resolvedWeek = s.week;
      chargeExpense(s, "penalties", c.penalty);
      changeReputation(s, -8);
      changeRelation(s, c.clientId, -20);
      addEvent(s, `Missed the ${client.name} contract deadline. Paid a $${c.penalty.toLocaleString("en-US")} penalty; reputation fell.`, true);
    }
  }

  const open = s.contracts.filter((c) => c.status === "open").length;
  if (s.week >= s.nextContractWeek && open < MAX_OPEN_OFFERS) {
    const offer = generateOffer(s);
    // Offers are shown as a count in the sidebar rather than logged.
    s.contracts.push(offer);
    s.nextContractWeek = s.week + randInt(s, 2, 5);
  }

  // Keep the 30 most recent finished contracts for the history table.
  const finished = s.contracts.filter((c) => ["completed", "failed", "lost"].includes(c.status));
  const drop = new Set(finished.slice(0, Math.max(0, finished.length - 30)).map((c) => c.id));
  s.contracts = s.contracts.filter((c) => c.status !== "expired" && !drop.has(c.id));
}

export { changeRelation };
