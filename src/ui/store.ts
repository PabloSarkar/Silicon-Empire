// UI-side state (Zustand). Holds the current screen, the running game and
// clock settings. Game rules live in src/sim; this store only calls them.

import { create } from "zustand";
import { platform } from "../platform";
import { saveGame } from "../save/saveManager";
import { addEvent, createNewGame, tick, type NewGameParams } from "../sim/game";
import type { GameState } from "../sim/types";
import { parseSettings, type Settings } from "./settings";

export type Screen = "menu" | "newGame" | "loadGame" | "settings" | "game";
export type Speed = 1 | 2 | 3;

/** Real milliseconds per in-game week at 1× speed. Placeholder for balancing. */
export const MS_PER_WEEK_AT_1X = 1000;

interface Store {
  screen: Screen;
  /** Where the Settings screen returns to. */
  settingsReturnTo: Screen;
  game: GameState | null;
  paused: boolean;
  speed: Speed;
  settings: Settings;
  /** Week of the last manual save or load; used to warn about unsaved progress. */
  lastSavedWeek: number | null;
  /** Short status line shown in the top bar, e.g. "Saved." */
  status: string;

  goTo(screen: Screen): void;
  openSettings(): void;
  closeSettings(): void;
  updateSettings(patch: Partial<Settings>): void;

  startNewGame(params: NewGameParams): void;
  startLoadedGame(game: GameState): void;
  quitToMenu(): void;

  advanceWeek(): void;
  setSpeed(speed: Speed): void;
  togglePause(): void;
  setPaused(paused: boolean): void;
  saveNow(): Promise<void>;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useStore = create<Store>((set, get) => ({
  screen: "menu",
  settingsReturnTo: "menu",
  game: null,
  paused: true,
  speed: 1,
  settings: parseSettings(platform.settings.load()),
  lastSavedWeek: null,
  status: "",

  goTo: (screen) => set({ screen }),

  openSettings: () => {
    const { screen } = get();
    // Pause while in Settings so time doesn't pass unseen.
    set({ settingsReturnTo: screen, screen: "settings", paused: true });
  },

  closeSettings: () => set({ screen: get().settingsReturnTo }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    platform.settings.save(settings);
    set({ settings });
  },

  startNewGame: (params) => {
    const game = createNewGame(params, {
      id: randomId(),
      seed: Math.floor(Math.random() * 2 ** 31),
    });
    platform.achievements.unlock("company_founded");
    set({ game, screen: "game", paused: true, speed: 1, lastSavedWeek: null, status: "" });
  },

  startLoadedGame: (game) =>
    set({ game, screen: "game", paused: true, speed: 1, lastSavedWeek: game.week, status: "Game loaded." }),

  quitToMenu: () => set({ game: null, screen: "menu", paused: true, status: "" }),

  advanceWeek: () => {
    const { game, settings } = get();
    if (!game) return;
    const next = tick(game);
    set({ game: next });

    const every = settings.autosaveWeeks;
    if (every > 0 && next.week % every === 0) {
      saveGame(platform.saves, next, "auto").then(
        () => {
          if (get().game?.id === next.id) set({ status: "Autosaved." });
        },
        (e: unknown) => {
          const current = get().game;
          if (current?.id === next.id) {
            set({ game: addEvent(current, `Autosave failed: ${String(e)}`) });
          }
        },
      );
    }
  },

  setSpeed: (speed) => set({ speed, paused: false }),
  togglePause: () => set({ paused: !get().paused }),
  setPaused: (paused) => set({ paused }),

  saveNow: async () => {
    const { game } = get();
    if (!game) return;
    try {
      await saveGame(platform.saves, game, "manual");
      set({ lastSavedWeek: game.week, status: "Saved." });
    } catch (e) {
      set({ status: `Save failed: ${e instanceof Error ? e.message : String(e)}` });
    }
  },
}));
