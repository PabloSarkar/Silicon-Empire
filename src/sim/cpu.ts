// CPU design model: turns a CpuSpec into derived stats (performance, power,
// temperature, cost). Also builds "reference designs" for a given year, which
// rivals and contract clients use, so everyone plays by the same rules.

import {
  AMBIENT_TEMP_C,
  DEFECT_DENSITY,
  HOT_TEMP_C,
  TEST_COST_PER_UNIT,
} from "../data/balance";
import { yearOf } from "../data/market";
import {
  RESEARCH_NODES,
  STARTING_RESEARCH,
  getResearchNode,
  maskCost,
  type ClockNode,
  type CoresNode,
  type FeatureNode,
  type PowerNode,
  type ProcessNode,
  type ResearchNode,
  type SocketNode,
  type ThermalNode,
  type WidthNode,
} from "../data/research";
import type { CpuSpec, CpuStats } from "./types";

export const NAME_MAX = 32;

/** What a company (or rival) can build with a given set of finished research. */
export interface Tech {
  processes: ProcessNode[];
  widths: WidthNode[];
  features: FeatureNode[];
  sockets: SocketNode[];
  maxClockMHz: number;
  maxCores: number;
  powerMult: number;
  thermalResistance: number;
}

function ofKind<K extends ResearchNode["kind"]>(nodes: ResearchNode[], kind: K) {
  return nodes.filter((n): n is Extract<ResearchNode, { kind: K }> => n.kind === kind);
}

export function techFrom(completed: readonly string[]): Tech {
  const done = new Set(completed);
  // Keep the data-file order, which is oldest first.
  const nodes = RESEARCH_NODES.filter((n) => done.has(n.id));
  const clocks = ofKind(nodes, "clock") as ClockNode[];
  const cores = ofKind(nodes, "cores") as CoresNode[];
  const powers = ofKind(nodes, "power") as PowerNode[];
  const thermals = ofKind(nodes, "thermal") as ThermalNode[];
  return {
    processes: ofKind(nodes, "process"),
    widths: ofKind(nodes, "width"),
    features: ofKind(nodes, "feature"),
    sockets: ofKind(nodes, "socket"),
    maxClockMHz: Math.max(1, ...clocks.map((c) => c.maxClockMHz)),
    maxCores: Math.max(1, ...cores.map((c) => c.maxCores)),
    powerMult: Math.min(1, ...powers.map((p) => p.powerMult)),
    thermalResistance: Math.min(20, ...thermals.map((t) => t.thermalResistance)),
  };
}

/** Research a company would have if it had everything available `lagYears` ago. */
export function researchForWeek(week: number, lagYears = 0): string[] {
  const year = Math.floor(yearOf(week)) - lagYears;
  const ids = RESEARCH_NODES.filter((n) => n.year <= year).map((n) => n.id);
  return [...new Set([...STARTING_RESEARCH, ...ids])];
}

export function evaluateDesign(
  spec: CpuSpec,
  tech: Pick<Tech, "powerMult" | "thermalResistance">,
): CpuStats {
  const node = getResearchNode(spec.nodeId) as ProcessNode;
  const width = getResearchNode(spec.widthId) as WidthNode;
  const socket = getResearchNode(spec.socketId) as SocketNode;
  const features = spec.features.map((id) => getResearchNode(id) as FeatureNode);

  const transistorMult = features.reduce((m, f) => m * f.transistorMult, 1);
  const ipc = features.reduce((m, f) => m * f.ipcMult, width.ipc);
  const transistorsM = width.transistorsM * transistorMult * spec.cores;
  const dieAreaMm2 = transistorsM / node.density;
  const perf = spec.clockMHz * ipc * Math.pow(spec.cores, 0.85) * socket.bandwidth;
  const powerW = transistorsM * (spec.clockMHz / 1000) * node.energy * tech.powerMult;
  const tempC = AMBIENT_TEMP_C + powerW * tech.thermalResistance;

  const dieCm2 = dieAreaMm2 / 100;
  const chipYield = Math.exp(-dieCm2 * DEFECT_DENSITY);
  const diesPerWafer = Math.max(1, Math.floor((node.waferAreaCm2 / dieCm2) * 0.9));
  const rawUnitCost =
    node.waferCost / (diesPerWafer * chipYield) + socket.packageCost + TEST_COST_PER_UNIT;

  const designPoints = Math.round(
    30 + 18 * Math.log2(1 + transistorsM * 1000) + 8 * features.length + 4 * (spec.cores - 1),
  );

  return {
    transistorsM,
    dieAreaMm2,
    perf,
    powerW,
    tempC,
    yield: chipYield,
    rawUnitCost,
    designPoints,
    maskCost: maskCost(node),
  };
}

/** Problems that stop a design from being built. Empty if the design is valid. */
export function validateSpec(spec: CpuSpec, completed: readonly string[]): string[] {
  const errors: string[] = [];
  const done = new Set(completed);
  const name = spec.name.trim();
  if (!name) errors.push("Give the design a name.");
  else if (name.length > NAME_MAX) errors.push(`Name must be ${NAME_MAX} characters or fewer.`);

  for (const id of [spec.nodeId, spec.widthId, spec.socketId, ...spec.features]) {
    if (!done.has(id)) errors.push(`${safeName(id)} has not been researched.`);
  }
  if (errors.length > 0) return errors;

  const tech = techFrom(completed);
  if (!Number.isInteger(spec.cores) || spec.cores < 1 || spec.cores > tech.maxCores) {
    errors.push(`Cores must be between 1 and ${tech.maxCores}.`);
  }
  if (!(spec.clockMHz >= 1 && spec.clockMHz <= tech.maxClockMHz)) {
    errors.push(`Clock must be between 1 and ${tech.maxClockMHz} MHz.`);
  }
  const socket = getResearchNode(spec.socketId) as SocketNode;
  const stats = evaluateDesign(spec, tech);
  if (stats.powerW > socket.maxPowerW) {
    errors.push(
      `Uses ${stats.powerW.toFixed(1)} W but the ${socket.name} socket supports ${socket.maxPowerW} W. Lower the clock or cores, or use a newer socket or process.`,
    );
  }
  return errors;
}

function safeName(id: string): string {
  try {
    return getResearchNode(id).name;
  } catch {
    return id;
  }
}

export interface DesignProfile {
  /** Fraction of the maximum clock to aim for. */
  clockFrac: number;
  /** Fraction of the maximum core count to use. */
  coreFrac: number;
}

/**
 * A sensible design using a set of finished research: newest process, width
 * and socket, every feature, and the clock lowered until the chip fits its
 * socket and stays cool.
 */
export function bestDesign(
  completed: readonly string[],
  profile: DesignProfile,
  name = "Reference",
): { spec: CpuSpec; stats: CpuStats } {
  const tech = techFrom(completed);
  const node = tech.processes[tech.processes.length - 1];
  const width = tech.widths[tech.widths.length - 1];
  const socket = tech.sockets[tech.sockets.length - 1];
  const spec: CpuSpec = {
    name,
    nodeId: node.id,
    widthId: width.id,
    features: tech.features.map((f) => f.id),
    socketId: socket.id,
    cores: Math.max(1, Math.round(tech.maxCores * profile.coreFrac)),
    clockMHz: Math.max(1, Math.round(tech.maxClockMHz * profile.clockFrac)),
  };
  let stats = evaluateDesign(spec, tech);
  while (
    spec.clockMHz > 1 &&
    (stats.powerW > socket.maxPowerW * 0.9 || stats.tempC > HOT_TEMP_C - 5)
  ) {
    spec.clockMHz = Math.max(1, Math.floor(spec.clockMHz * 0.92));
    stats = evaluateDesign(spec, tech);
  }
  return { spec, stats };
}

/** bestDesign() for the technology the industry had `lagYears` before `week`. */
export function referenceDesign(
  week: number,
  lagYears: number,
  profile: DesignProfile,
  name = "Reference",
): { spec: CpuSpec; stats: CpuStats } {
  return bestDesign(researchForWeek(week, lagYears), profile, name);
}
