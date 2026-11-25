import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createIndexedDbSaveStorage } from "../platform/browser";
import type { SaveStorage } from "../platform/types";
import { tick } from "../sim/game";
import { newGame } from "../sim/testUtils";
import { SAVE_VERSION, SaveError, deserialize, serialize } from "./saveFile";
import { exportSave, importSave, listSaves, loadGame, saveGame } from "./saveManager";

function makeGame(id = "g1") {
  return { ...newGame(123), id };
}

function memoryStorage(): SaveStorage {
  const m = new Map<string, string>();
  return {
    save: async (k, v) => void m.set(k, v),
    load: async (k) => m.get(k) ?? null,
    list: async () => [...m.keys()],
    delete: async (k) => void m.delete(k),
  };
}

/** A save written by the Phase 1 build (save version 1). */
const V1_SAVE = JSON.stringify({
  saveVersion: 1,
  savedAt: "2026-11-23T22:00:00.000Z",
  game: {
    id: "old",
    seed: 5,
    rngState: 5,
    week: 10,
    company: {
      name: "Old Co",
      logo: { shape: "circle", primaryColor: "#000000", secondaryColor: "#ffffff", font: "serif", text: "OC" },
      cash: 240000,
    },
    ceo: { name: "Grace", archetype: "business" },
    events: [{ week: 0, message: "Old Co is founded on 1 Jan 1975." }],
  },
});

describe("save file", () => {
  it("round-trips a game", () => {
    const g = tick(makeGame());
    const file = deserialize(serialize(g, new Date("2026-01-01T00:00:00Z")));
    expect(file.saveVersion).toBe(SAVE_VERSION);
    expect(file.savedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(file.game).toEqual(g);
  });

  it("upgrades a version-1 save, keeping the company and adding every system", () => {
    const { game } = deserialize(V1_SAVE);
    expect(game.id).toBe("old");
    expect(game.week).toBe(10);
    expect(game.company.name).toBe("Old Co");
    expect(game.company.cash).toBe(240000);
    expect(game.ceo.archetype).toBe("business");
    expect(game.candidates.length).toBeGreaterThan(0);
    expect(game.rivalProducts.length).toBeGreaterThan(0);
    // The upgraded game runs.
    expect(tick(game).week).toBe(11);
  });

  it("rejects non-JSON, foreign JSON, damaged games and future versions", () => {
    expect(() => deserialize("not json")).toThrow(SaveError);
    expect(() => deserialize("{}")).toThrow(/not a Silicon Empire save/);
    expect(() => deserialize(JSON.stringify({ saveVersion: SAVE_VERSION, game: { id: "x" } }))).toThrow(/damaged/);
    expect(() => deserialize(JSON.stringify({ saveVersion: 1, game: { id: "x" } }))).toThrow(/damaged/);
    const future = JSON.stringify({ saveVersion: SAVE_VERSION + 1, savedAt: "", game: makeGame() });
    expect(() => deserialize(future)).toThrow(/newer version/);
  });
});

describe("save manager", () => {
  it("saves, lists, loads and exports", async () => {
    const storage = memoryStorage();
    const g = makeGame();
    await saveGame(storage, g, "manual", new Date("2026-01-01T00:00:00Z"));
    await saveGame(storage, tick(g), "auto", new Date("2026-01-02T00:00:00Z"));
    await storage.save("manual-broken", "{oops");
    await storage.save("unrelated-key", "ignored");

    const { saves, broken } = await listSaves(storage);
    expect(saves.map((s) => s.kind)).toEqual(["auto", "manual"]); // Newest first.
    expect(saves[0].week).toBe(1);
    expect(broken.map((b) => b.slot)).toEqual(["manual-broken"]);

    expect(await loadGame(storage, "manual-g1")).toEqual(g);
    const exported = await exportSave(storage, "manual-g1");
    expect(exported.filename).toBe("silicon-empire-Test-Semiconductor-week0.json");
  });

  it("imports an exported file into the manual slot", async () => {
    const source = memoryStorage();
    await saveGame(source, makeGame("g2"), "auto");
    const { text } = await exportSave(source, "auto-g2");

    const target = memoryStorage();
    const game = await importSave(target, text);
    expect(game.id).toBe("g2");
    expect(await target.list()).toEqual(["manual-g2"]);
  });

  it("works with the IndexedDB browser storage", async () => {
    const storage = createIndexedDbSaveStorage();
    await saveGame(storage, makeGame("idb"), "manual");
    expect(await storage.list()).toContain("manual-idb");
    expect((await loadGame(storage, "manual-idb")).id).toBe("idb");
    await storage.delete("manual-idb");
    expect(await storage.list()).not.toContain("manual-idb");
  });
});
