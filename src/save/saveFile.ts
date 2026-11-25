// Save file format, versioning and migrations (README §5 rule 4).
//
// When the shape of GameState changes:
//   1. Bump SAVE_VERSION.
//   2. Add a migration MIGRATIONS[oldVersion] that turns a version-N
//      game object into a version-(N+1) one.
//   3. Update isGameState() and add a test with an old save.
// Never edit an existing migration once it has shipped.

import { initSystems } from "../sim/game";
import type { GameState } from "../sim/types";

export const SAVE_VERSION = 2;

export interface SaveFile {
  saveVersion: number;
  /** Real-world time the file was written, ISO 8601. Not used by the sim. */
  savedAt: string;
  game: GameState;
}

export class SaveError extends Error {}

/** MIGRATIONS[n] upgrades the `game` object of a version-n save to version n+1. */
const MIGRATIONS: Record<number, (game: unknown) => unknown> = {
  // v1 (Phase 1 shell) → v2 (pilot): add every game system with starting
  // values. The company keeps its name, logo, cash, CEO, date and event log.
  1: (game) => {
    if (!isV1Game(game)) throw new SaveError("This save file is damaged or incomplete.");
    return initSystems(game);
  },
};

function isV1Game(v: unknown): v is Pick<GameState, "id" | "seed" | "rngState" | "week" | "company" | "ceo" | "events"> {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    typeof v.seed === "number" &&
    typeof v.rngState === "number" &&
    typeof v.week === "number" &&
    isRecord(v.company) &&
    isRecord(v.ceo) &&
    Array.isArray(v.events)
  );
}

export function serialize(game: GameState, savedAt: Date): string {
  const file: SaveFile = { saveVersion: SAVE_VERSION, savedAt: savedAt.toISOString(), game };
  return JSON.stringify(file);
}

export function deserialize(text: string): SaveFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError("This file is not a valid save (it is not JSON).");
  }
  if (!isRecord(raw) || typeof raw.saveVersion !== "number" || !("game" in raw)) {
    throw new SaveError("This file is not a Silicon Empire save.");
  }

  let version = raw.saveVersion;
  if (!Number.isInteger(version) || version < 1) {
    throw new SaveError(`Unknown save version: ${String(raw.saveVersion)}.`);
  }
  if (version > SAVE_VERSION) {
    throw new SaveError(
      `This save was made by a newer version of the game (save version ${version}; this game reads up to ${SAVE_VERSION}).`,
    );
  }

  let game: unknown = raw.game;
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) throw new SaveError(`No migration from save version ${version}.`);
    game = migrate(game);
    version++;
  }

  if (!isGameState(game)) {
    throw new SaveError("This save file is damaged or incomplete.");
  }
  const savedAt = typeof raw.savedAt === "string" ? raw.savedAt : new Date(0).toISOString();
  return { saveVersion: SAVE_VERSION, savedAt, game };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const ARCHETYPE_IDS = ["research", "technical", "business", "marketing"];
const LOGO_SHAPES = ["circle", "square", "diamond", "hexagon", "triangle"];
const LOGO_FONTS = ["sans", "serif", "mono"];

/** Structural check of a version-SAVE_VERSION game object. */
export function isGameState(v: unknown): v is GameState {
  if (!isRecord(v)) return false;
  const { company, ceo, events } = v;
  if (
    typeof v.id !== "string" ||
    typeof v.seed !== "number" ||
    typeof v.rngState !== "number" ||
    typeof v.week !== "number" ||
    !Number.isInteger(v.week) ||
    v.week < 0
  )
    return false;

  if (
    !isRecord(company) ||
    typeof company.name !== "string" ||
    typeof company.cash !== "number" ||
    typeof company.reputation !== "number"
  )
    return false;
  const logo = company.logo;
  if (
    !isRecord(logo) ||
    !LOGO_SHAPES.includes(logo.shape as string) ||
    !LOGO_FONTS.includes(logo.font as string) ||
    typeof logo.primaryColor !== "string" ||
    typeof logo.secondaryColor !== "string" ||
    typeof logo.text !== "string"
  )
    return false;

  if (!isRecord(ceo) || typeof ceo.name !== "string" || !ARCHETYPE_IDS.includes(ceo.archetype as string))
    return false;

  // Version-2 systems: check the containers exist with the right shapes.
  const arrays = [
    "employees", "candidates", "products", "fabOrders", "rivals", "rivalProducts",
    "contracts", "weeklyProfits", "history", "years", "achievements",
  ];
  if (!arrays.every((k) => Array.isArray(v[k]))) return false;
  const records = ["research", "investors", "bank", "ledger", "clientRelations"];
  if (!records.every((k) => isRecord(v[k]))) return false;
  const research = v.research as Record<string, unknown>;
  if (!Array.isArray(research.completed) || !isRecord(research.progress)) return false;
  const bank = v.bank as Record<string, unknown>;
  if (typeof bank.creditScore !== "number" || !Array.isArray(bank.loans)) return false;
  const investors = v.investors as Record<string, unknown>;
  if (typeof investors.goodwill !== "number" || typeof investors.expectation !== "number") return false;
  if (
    typeof v.nextId !== "number" ||
    typeof v.sharePrice !== "number" ||
    typeof v.weekNet !== "number" ||
    typeof v.nextCandidatesWeek !== "number" ||
    typeof v.nextContractWeek !== "number" ||
    !("gameOver" in v) ||
    !("lastLedger" in v)
  )
    return false;

  if (!Array.isArray(events)) return false;
  return events.every(
    (e) => isRecord(e) && typeof e.week === "number" && typeof e.message === "string",
  );
}
