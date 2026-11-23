// Save slots on top of a SaveStorage adapter.
//
// Slot naming: each playthrough has one manual slot and one autosave slot,
//   "manual-<gameId>" and "auto-<gameId>".

import type { SaveStorage } from "../platform/types";
import type { GameState } from "../sim/types";
import { SaveError, deserialize, serialize } from "./saveFile";

export type SlotKind = "manual" | "auto";

export interface SaveSummary {
  slot: string;
  kind: SlotKind;
  gameId: string;
  companyName: string;
  ceoName: string;
  week: number;
  savedAt: string;
}

export interface BrokenSave {
  slot: string;
  error: string;
}

export function slotFor(gameId: string, kind: SlotKind): string {
  return `${kind}-${gameId}`;
}

function kindOf(slot: string): SlotKind | null {
  if (slot.startsWith("manual-")) return "manual";
  if (slot.startsWith("auto-")) return "auto";
  return null;
}

export async function saveGame(
  storage: SaveStorage,
  game: GameState,
  kind: SlotKind,
  now: Date = new Date(),
): Promise<string> {
  const slot = slotFor(game.id, kind);
  await storage.save(slot, serialize(game, now));
  return slot;
}

export async function loadGame(storage: SaveStorage, slot: string): Promise<GameState> {
  const text = await storage.load(slot);
  if (text === null) throw new SaveError("That save no longer exists.");
  return deserialize(text).game;
}

/** All saves, newest first. Saves that fail to read are reported separately. */
export async function listSaves(
  storage: SaveStorage,
): Promise<{ saves: SaveSummary[]; broken: BrokenSave[] }> {
  const saves: SaveSummary[] = [];
  const broken: BrokenSave[] = [];
  for (const slot of await storage.list()) {
    const kind = kindOf(slot);
    if (!kind) continue;
    try {
      const text = await storage.load(slot);
      if (text === null) continue;
      const { game, savedAt } = deserialize(text);
      saves.push({
        slot,
        kind,
        gameId: game.id,
        companyName: game.company.name,
        ceoName: game.ceo.name,
        week: game.week,
        savedAt,
      });
    } catch (e) {
      broken.push({ slot, error: e instanceof Error ? e.message : String(e) });
    }
  }
  saves.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return { saves, broken };
}

export async function exportSave(
  storage: SaveStorage,
  slot: string,
): Promise<{ filename: string; text: string }> {
  const text = await storage.load(slot);
  if (text === null) throw new SaveError("That save no longer exists.");
  const { game } = deserialize(text);
  const safeName = game.company.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "save";
  return { filename: `silicon-empire-${safeName}-week${game.week}.json`, text };
}

/** Imports a save file into the manual slot of its playthrough. Returns the game. */
export async function importSave(
  storage: SaveStorage,
  text: string,
  now: Date = new Date(),
): Promise<GameState> {
  const { game } = deserialize(text); // Throws SaveError on bad files.
  await saveGame(storage, game, "manual", now);
  return game;
}
