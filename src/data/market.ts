// Market, rival, foundry and contract-client data. All company names are
// fictional (D-015).

export type SegmentId = "budget" | "mainstream" | "enthusiast";

export interface Segment {
  id: SegmentId;
  name: string;
  /** Share of total unit demand. */
  share: number;
  /** Typical price buyers in this segment expect, in US dollars. */
  refPrice: number;
  /** How strongly buyers reward performance. */
  perfWeight: number;
  /** How strongly buyers punish price. */
  priceWeight: number;
}

export const SEGMENTS: readonly Segment[] = [
  { id: "budget", name: "Budget", share: 0.35, refPrice: 50, perfWeight: 0.8, priceWeight: 2.2 },
  { id: "mainstream", name: "Mainstream", share: 0.45, refPrice: 150, perfWeight: 1.5, priceWeight: 1.5 },
  { id: "enthusiast", name: "Enthusiast", share: 0.2, refPrice: 400, perfWeight: 3, priceWeight: 0.7 },
];

/** Weight of buyers who choose not to buy at all (per segment, in appeal units). */
export const OUTSIDE_OPTION = 0.5;

/** Fractional in-game year, e.g. 1975.5. */
export function yearOf(week: number): number {
  return 1975 + week / 52.18;
}

/** Total CPUs bought per week across all segments. */
export function marketUnitsPerWeek(week: number): number {
  const y = yearOf(week);
  const early = Math.min(y, 2000) - 1975;
  const late = Math.max(0, y - 2000);
  return 800 * Math.pow(1.17, early) * Math.pow(1.04, late);
}

/** Salary and office cost index (1.0 in 1975). */
export function wageIndex(week: number): number {
  return Math.pow(1.035, yearOf(week) - 1975);
}

export interface RivalDef {
  id: string;
  name: string;
  /** Product name prefix, e.g. "VX". */
  prefix: string;
  /** Years behind the technology frontier. */
  lagYears: number;
  /** Brand popularity, 0–100. */
  popularity: number;
  /** Multiplier on segment reference prices. */
  priceMult: number;
  /** Segments this rival targets. */
  segments: SegmentId[];
}

export const RIVALS: readonly RivalDef[] = [
  { id: "varex", name: "Varex Microsystems", prefix: "VX", lagYears: 0, popularity: 65, priceMult: 1.15, segments: ["mainstream", "enthusiast"] },
  { id: "orinth", name: "Orinth Semiconductor", prefix: "Orinth", lagYears: 1, popularity: 55, priceMult: 0.95, segments: ["budget", "mainstream"] },
  { id: "calder", name: "Calder Logic", prefix: "CL", lagYears: 2, popularity: 45, priceMult: 0.8, segments: ["budget"] },
];

export interface FabDef {
  id: string;
  name: string;
  /** Years after a process node's introduction before this fab offers it. */
  lagYears: number;
  /** Multiplier on raw wafer and packaging cost. */
  priceMult: number;
  /** Share of produced chips that are defective (before QC improvements). */
  defectRate: number;
  leadWeeks: number;
  minOrder: number;
}

export const FABS: readonly FabDef[] = [
  { id: "kessler", name: "Kessler Foundry", lagYears: 2, priceMult: 1.25, defectRate: 0.1, leadWeeks: 6, minOrder: 500 },
  { id: "pacific", name: "Pacific Wafer Works", lagYears: 1, priceMult: 1.45, defectRate: 0.06, leadWeeks: 5, minOrder: 1000 },
  { id: "nordvik", name: "Nordvik Semiconductor Manufacturing", lagYears: 0, priceMult: 1.8, defectRate: 0.03, leadWeeks: 4, minOrder: 2500 },
];

export function getFab(id: string): FabDef {
  const fab = FABS.find((f) => f.id === id);
  if (!fab) throw new Error(`Unknown fab: ${id}`);
  return fab;
}

export interface ClientDef {
  id: string;
  name: string;
  industry: string;
  /** Multiplier on the power limit they ask for (below 1 = power-sensitive). */
  powerStrictness: number;
  /** Multiplier on the performance they ask for. */
  perfDemand: number;
}

export const CLIENTS: readonly ClientDef[] = [
  { id: "bluefield", name: "Bluefield Terminals", industry: "Computer terminals", powerStrictness: 1.2, perfDemand: 0.8 },
  { id: "orion", name: "Orion Calculators", industry: "Calculators", powerStrictness: 0.6, perfDemand: 0.5 },
  { id: "mesa", name: "Mesa Arcade Systems", industry: "Arcade machines", powerStrictness: 1.5, perfDemand: 1 },
  { id: "tessera", name: "Tessera Telecom", industry: "Telecommunications", powerStrictness: 0.8, perfDemand: 0.9 },
  { id: "cobalt", name: "Cobalt Motor Electronics", industry: "Automotive", powerStrictness: 0.7, perfDemand: 0.6 },
  { id: "westbrook", name: "Westbrook Business Machines", industry: "Office computers", powerStrictness: 1.3, perfDemand: 1.1 },
  { id: "aurora", name: "Aurora Medical Devices", industry: "Medical equipment", powerStrictness: 0.75, perfDemand: 0.7 },
  { id: "lindqvist", name: "Lindqvist Industrial Controls", industry: "Industrial control", powerStrictness: 0.9, perfDemand: 0.6 },
];

export function getClient(id: string): ClientDef {
  const c = CLIENTS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown client: ${id}`);
  return c;
}
