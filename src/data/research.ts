// Research tree (README §2.4). Six categories; each is a linear chain of
// tiers. A tier can be researched once the previous tier in its category is
// done and the in-game year has reached the tier's `year` (D-025: game-paced
// history, loosely following the real industry from 1975).
//
// Numbers are game values, tuned for play, not real-world measurements.

export type ResearchCategory = "process" | "architecture" | "socket" | "clock" | "power" | "thermal";

interface NodeBase {
  id: string;
  category: ResearchCategory;
  name: string;
  /** First in-game year this tier can be researched. */
  year: number;
  description: string;
}

export interface ProcessNode extends NodeBase {
  kind: "process";
  /** Millions of transistors per mm². */
  density: number;
  /** Power per (million transistors × GHz), in watts. */
  energy: number;
  waferAreaCm2: number;
  waferCost: number;
}

export interface WidthNode extends NodeBase {
  kind: "width";
  /** Instructions per clock of a basic core of this width. */
  ipc: number;
  /** Transistors (millions) in a basic core of this width. */
  transistorsM: number;
}

export interface FeatureNode extends NodeBase {
  kind: "feature";
  transistorMult: number;
  ipcMult: number;
}

export interface CoresNode extends NodeBase {
  kind: "cores";
  maxCores: number;
}

export interface SocketNode extends NodeBase {
  kind: "socket";
  maxPowerW: number;
  /** Performance multiplier from memory/bus bandwidth. */
  bandwidth: number;
  packageCost: number;
}

export interface ClockNode extends NodeBase {
  kind: "clock";
  maxClockMHz: number;
}

export interface PowerNode extends NodeBase {
  kind: "power";
  /** Multiplier on chip power. Lower is better. */
  powerMult: number;
}

export interface ThermalNode extends NodeBase {
  kind: "thermal";
  /** °C of temperature rise per watt. Lower is better. */
  thermalResistance: number;
}

export type ResearchNode =
  | ProcessNode
  | WidthNode
  | FeatureNode
  | CoresNode
  | SocketNode
  | ClockNode
  | PowerNode
  | ThermalNode;

export const CATEGORIES: { id: ResearchCategory; name: string }[] = [
  { id: "process", name: "Process Nodes" },
  { id: "architecture", name: "Instruction Sets (Architecture)" },
  { id: "socket", name: "Socket and Standards" },
  { id: "clock", name: "Clock Speeds" },
  { id: "power", name: "Power Management" },
  { id: "thermal", name: "Thermal Management" },
];

function proc(
  id: string, name: string, year: number, density: number, energy: number,
  waferAreaCm2: number, waferCost: number,
): ProcessNode {
  return {
    id, name, year, density, energy, waferAreaCm2,
    waferCost: waferCost * 2,
    category: "process", kind: "process",
    description: `${name} manufacturing process.`,
  };
}

const PROCESS: ProcessNode[] = [
  proc("node-10um", "10 µm", 1975, 0.0003, 50000, 45, 200),
  proc("node-8um", "8 µm", 1976, 0.0004, 25000, 45, 220),
  proc("node-6um", "6 µm", 1979, 0.0006, 9000, 78, 300),
  proc("node-3um", "3 µm", 1982, 0.0012, 3000, 78, 350),
  proc("node-1500nm", "1.5 µm", 1985, 0.004, 450, 176, 500),
  proc("node-1um", "1 µm", 1988, 0.012, 160, 176, 600),
  proc("node-800nm", "800 nm", 1990, 0.02, 80, 176, 700),
  proc("node-600nm", "600 nm", 1993, 0.03, 35, 314, 900),
  proc("node-350nm", "350 nm", 1996, 0.06, 16, 314, 1100),
  proc("node-250nm", "250 nm", 1998, 0.12, 7, 314, 1300),
  proc("node-180nm", "180 nm", 2000, 0.25, 2.6, 314, 1500),
  proc("node-130nm", "130 nm", 2002, 0.5, 1.2, 706, 2500),
  proc("node-90nm", "90 nm", 2004, 1, 0.65, 706, 3000),
  proc("node-65nm", "65 nm", 2006, 2, 0.32, 706, 3500),
  proc("node-45nm", "45 nm", 2008, 3.5, 0.17, 706, 4000),
  proc("node-32nm", "32 nm", 2010, 6, 0.1, 706, 4500),
  proc("node-22nm", "22 nm", 2012, 10, 0.065, 706, 5500),
  proc("node-14nm", "14 nm", 2015, 20, 0.045, 706, 7000),
  proc("node-10nm", "10 nm", 2018, 40, 0.03, 706, 8500),
  proc("node-7nm", "7 nm", 2019, 60, 0.022, 706, 10000),
  proc("node-5nm", "5 nm", 2021, 100, 0.016, 706, 15000),
  proc("node-3nm", "3 nm", 2023, 150, 0.012, 706, 20000),
];

// Data-width generations, design features and multi-core tiers share one
// chain, in the order they become available.
const ARCHITECTURE: (WidthNode | FeatureNode | CoresNode)[] = [
  { id: "arch-8bit", category: "architecture", kind: "width", name: "8-bit core", year: 1975, ipc: 0.25, transistorsM: 0.005, description: "A simple 8-bit processor core." },
  { id: "arch-16bit", category: "architecture", kind: "width", name: "16-bit core", year: 1977, ipc: 0.4, transistorsM: 0.03, description: "Wider registers and a larger address space." },
  { id: "feat-pipeline", category: "architecture", kind: "feature", name: "Instruction pipelining", year: 1982, transistorMult: 1.6, ipcMult: 1.6, description: "Overlaps the stages of consecutive instructions." },
  { id: "arch-32bit", category: "architecture", kind: "width", name: "32-bit core", year: 1985, ipc: 0.6, transistorsM: 0.25, description: "32-bit registers and flat memory addressing." },
  { id: "feat-cache", category: "architecture", kind: "feature", name: "On-chip cache", year: 1987, transistorMult: 2, ipcMult: 1.4, description: "Small, fast memory on the processor die." },
  { id: "feat-fpu", category: "architecture", kind: "feature", name: "Integrated FPU", year: 1989, transistorMult: 1.5, ipcMult: 1.3, description: "Floating-point maths unit on the same die." },
  { id: "feat-superscalar", category: "architecture", kind: "feature", name: "Superscalar execution", year: 1993, transistorMult: 2.5, ipcMult: 1.7, description: "Issues more than one instruction per clock." },
  { id: "feat-ooo", category: "architecture", kind: "feature", name: "Out-of-order execution", year: 1995, transistorMult: 3, ipcMult: 1.5, description: "Reorders instructions to keep execution units busy." },
  { id: "feat-simd", category: "architecture", kind: "feature", name: "SIMD vector unit", year: 1997, transistorMult: 1.4, ipcMult: 1.2, description: "One instruction operates on several values at once." },
  { id: "feat-l2", category: "architecture", kind: "feature", name: "Large L2 cache", year: 1999, transistorMult: 1.8, ipcMult: 1.15, description: "A bigger second-level cache on the die." },
  { id: "feat-smt", category: "architecture", kind: "feature", name: "Simultaneous multithreading", year: 2002, transistorMult: 1.15, ipcMult: 1.15, description: "Runs two threads on one core." },
  { id: "arch-64bit", category: "architecture", kind: "width", name: "64-bit core", year: 2003, ipc: 0.8, transistorsM: 0.5, description: "64-bit registers and addressing." },
  { id: "cores-2", category: "architecture", kind: "cores", name: "Dual-core", year: 2005, maxCores: 2, description: "Two cores on one die." },
  { id: "cores-4", category: "architecture", kind: "cores", name: "Quad-core", year: 2007, maxCores: 4, description: "Up to four cores." },
  { id: "feat-l3", category: "architecture", kind: "feature", name: "Shared L3 cache", year: 2008, transistorMult: 2, ipcMult: 1.2, description: "A large cache shared by all cores." },
  { id: "cores-8", category: "architecture", kind: "cores", name: "8-core designs", year: 2011, maxCores: 8, description: "Up to eight cores." },
  { id: "feat-wide", category: "architecture", kind: "feature", name: "Wide-issue cores", year: 2013, transistorMult: 1.6, ipcMult: 1.25, description: "Wider decode and more execution ports." },
  { id: "cores-16", category: "architecture", kind: "cores", name: "16-core designs", year: 2017, maxCores: 16, description: "Up to sixteen cores." },
  { id: "cores-32", category: "architecture", kind: "cores", name: "Multi-die packages", year: 2020, maxCores: 32, description: "Several dies in one package; up to 32 cores." },
];

function sock(id: string, name: string, year: number, maxPowerW: number, bandwidth: number, packageCost: number): SocketNode {
  return {
    id, name, year, maxPowerW, bandwidth, packageCost,
    category: "socket", kind: "socket",
    description: `Supports up to ${maxPowerW} W.`,
  };
}

const SOCKET: SocketNode[] = [
  sock("sock-dip40", "40-pin DIP", 1975, 5, 1, 3),
  sock("sock-dip64", "64-pin DIP", 1977, 8, 1.1, 4),
  sock("sock-plcc68", "68-pin PLCC", 1982, 12, 1.2, 5),
  sock("sock-pga168", "168-pin PGA", 1987, 25, 1.35, 8),
  sock("sock-pga320", "320-pin PGA", 1993, 45, 1.5, 12),
  sock("sock-pga480", "480-pin PGA", 2000, 90, 1.7, 15),
  sock("sock-lga1000", "1000-pad LGA", 2004, 130, 1.9, 18),
  sock("sock-lga1200", "1200-pad LGA", 2011, 150, 2.1, 20),
  sock("sock-lga1700", "1700-pad LGA", 2020, 200, 2.3, 24),
];

const CLOCK_TIERS: [number, number][] = [
  [1975, 2], [1976, 3], [1977, 4], [1979, 8], [1982, 12], [1985, 20], [1987, 33], [1989, 50],
  [1991, 66], [1993, 100], [1995, 200], [1997, 300], [1999, 600], [2000, 1000],
  [2002, 2000], [2004, 3000], [2008, 3600], [2012, 4000], [2016, 4500], [2020, 5200],
];

function mhzLabel(mhz: number): string {
  return mhz >= 1000 ? `${mhz / 1000} GHz` : `${mhz} MHz`;
}

const CLOCK: ClockNode[] = CLOCK_TIERS.map(([year, mhz]) => ({
  id: `clock-${mhz}`,
  category: "clock",
  kind: "clock",
  name: `${mhzLabel(mhz)} clocks`,
  year,
  maxClockMHz: mhz,
  description: `Designs can run at up to ${mhzLabel(mhz)}.`,
}));

const POWER: PowerNode[] = [
  { id: "power-basic", category: "power", kind: "power", name: "Basic power design", year: 1975, powerMult: 1, description: "No special power management." },
  { id: "power-cmos", category: "power", kind: "power", name: "Low-power logic", year: 1978, powerMult: 0.9, description: "Logic styles that waste less power." },
  { id: "power-gating-clock", category: "power", kind: "power", name: "Clock gating", year: 1990, powerMult: 0.82, description: "Stops the clock to idle units." },
  { id: "power-dvs", category: "power", kind: "power", name: "Dynamic voltage scaling", year: 1998, powerMult: 0.72, description: "Lowers voltage when full speed isn't needed." },
  { id: "power-gating", category: "power", kind: "power", name: "Power gating", year: 2005, powerMult: 0.64, description: "Switches off unused blocks entirely." },
  { id: "power-dvfs", category: "power", kind: "power", name: "Per-core voltage control", year: 2012, powerMult: 0.56, description: "Each core runs at its own voltage and speed." },
  { id: "power-states", category: "power", kind: "power", name: "Deep sleep states", year: 2018, powerMult: 0.5, description: "Very low-power idle states." },
];

const THERMAL: ThermalNode[] = [
  { id: "thermal-ceramic", category: "thermal", kind: "thermal", name: "Ceramic package", year: 1975, thermalResistance: 14, description: "Plain ceramic package, no heatsink." },
  { id: "thermal-ceramic2", category: "thermal", kind: "thermal", name: "Improved ceramic package", year: 1975, thermalResistance: 11, description: "A ceramic package that sheds heat better." },
  { id: "thermal-heatsink", category: "thermal", kind: "thermal", name: "Clip-on heatsink support", year: 1982, thermalResistance: 7, description: "Packages designed for a small heatsink." },
  { id: "thermal-spreader", category: "thermal", kind: "thermal", name: "Heat spreader", year: 1990, thermalResistance: 3.5, description: "A metal lid spreads heat across the package." },
  { id: "thermal-fan", category: "thermal", kind: "thermal", name: "Active fan cooling", year: 1995, thermalResistance: 1.4, description: "Designs for a heatsink with a fan." },
  { id: "thermal-copper", category: "thermal", kind: "thermal", name: "Copper heat spreader", year: 2000, thermalResistance: 0.75, description: "Copper conducts heat away faster." },
  { id: "thermal-heatpipe", category: "thermal", kind: "thermal", name: "Heat-pipe cooler support", year: 2005, thermalResistance: 0.5, description: "Designs for heat-pipe coolers." },
  { id: "thermal-solder", category: "thermal", kind: "thermal", name: "Soldered heat spreader", year: 2012, thermalResistance: 0.42, description: "Solder replaces paste under the lid." },
  { id: "thermal-advanced", category: "thermal", kind: "thermal", name: "High-performance cooler support", year: 2018, thermalResistance: 0.36, description: "Designs for large tower and liquid coolers." },
];

export const RESEARCH_NODES: readonly ResearchNode[] = [
  ...PROCESS, ...ARCHITECTURE, ...SOCKET, ...CLOCK, ...POWER, ...THERMAL,
];

const BY_ID = new Map(RESEARCH_NODES.map((n) => [n.id, n]));

export function getResearchNode(id: string): ResearchNode {
  const node = BY_ID.get(id);
  if (!node) throw new Error(`Unknown research node: ${id}`);
  return node;
}

export function nodesInCategory(category: ResearchCategory): ResearchNode[] {
  return RESEARCH_NODES.filter((n) => n.category === category);
}

/** The previous tier in the same category, or null for the first tier. */
export function prerequisiteOf(id: string): string | null {
  const node = getResearchNode(id);
  const chain = nodesInCategory(node.category);
  const i = chain.findIndex((n) => n.id === id);
  return i > 0 ? chain[i - 1].id : null;
}

/** First tier of every category. A new company starts with these. */
export const STARTING_RESEARCH: readonly string[] = CATEGORIES.map((c) => nodesInCategory(c.id)[0].id);

const CATEGORY_WEIGHT: Record<ResearchCategory, number> = {
  process: 1.5,
  architecture: 1.2,
  socket: 0.8,
  clock: 1,
  power: 0.8,
  thermal: 0.8,
};

/** Research points needed to finish a tier. */
export function researchPointCost(node: ResearchNode): number {
  return Math.round(55 * Math.pow(1.085, node.year - 1975) * CATEGORY_WEIGHT[node.category]);
}

/** Cash paid when a tier's research starts. */
export function researchCashCost(node: ResearchNode): number {
  return Math.round((researchPointCost(node) * 60 * Math.pow(1.03, node.year - 1975)) / 100) * 100;
}

/** Cost of masks and tooling to finish a design on this process. */
export function maskCost(node: ProcessNode): number {
  return Math.round((25000 * Math.pow(1.12, node.year - 1975)) / 1000) * 1000;
}
