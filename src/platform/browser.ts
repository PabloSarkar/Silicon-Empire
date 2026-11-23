// Browser implementations of the platform adapters, used by the pilot.

import { createStore, del, get, keys, set } from "idb-keyval";
import type { Achievements, FileExport, Platform, SaveStorage, SettingsStorage } from "./types";

export function createIndexedDbSaveStorage(): SaveStorage {
  const store = createStore("silicon-empire", "saves");
  return {
    save: (slot, data) => set(slot, data, store),
    load: async (slot) => (await get<string>(slot, store)) ?? null,
    list: async () => (await keys(store)).map(String),
    delete: (slot) => del(slot, store),
  };
}

const SETTINGS_KEY = "silicon-empire:settings";

export function createLocalStorageSettings(): SettingsStorage {
  return {
    load() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null; // Private mode, blocked storage or corrupt data.
      }
    },
    save(data) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
      } catch {
        // Settings are a convenience; failing to store them is not fatal.
      }
    },
  };
}

/** The pilot has no achievement system; unlocks are only logged (README §5 rule 2). */
export function createLoggingAchievements(): Achievements {
  const unlocked = new Set<string>();
  return {
    unlock(id) {
      if (unlocked.has(id)) return;
      unlocked.add(id);
      console.info(`[achievement] ${id}`);
    },
  };
}

export function createDownloadFileExport(): FileExport {
  return {
    exportText(filename, text) {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}

export function createBrowserPlatform(): Platform {
  return {
    saves: createIndexedDbSaveStorage(),
    settings: createLocalStorageSettings(),
    achievements: createLoggingAchievements(),
    files: createDownloadFileExport(),
  };
}
