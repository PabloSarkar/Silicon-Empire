// UI-side state (Zustand). Holds the current screen, the running game and
// clock settings. Game rules live in src/sim; this store only calls them.

import { create } from "zustand";
import { platform } from "../platform";
import { saveGame } from "../save/saveManager";
import { ActionError } from "../sim/actions";
import { createNewGame, tick, type NewGameParams } from "../sim/game";
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
  /** Message from the last action the game refused, shown above the main panel. */
  actionError: string;

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

  /**
   * Applies a player action from src/sim/actions. Returns true if it worked;
   * otherwise shows the game's reason in the action error bar.
   */
  dispatch(action: (game: GameState) => GameState): boolean;
  clearActionError(): void;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Forwards achievements the sim has recorded to the platform (README §5 rule 2). */
function forwardAchievements(game: GameState) {
  for (const id of game.achievements) platform.achievements.unlock(id);
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
  actionError: "",

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
    forwardAchievements(game);
    set({ game, screen: "game", paused: true, speed: 1, lastSavedWeek: null, status: "", actionError: "" });
  },

  startLoadedGame: (game) => {
    forwardAchievements(game);
    set({ game, screen: "game", paused: true, speed: 1, lastSavedWeek: game.week, status: "Game loaded.", actionError: "" });
  },

  quitToMenu: () => set({ game: null, screen: "menu", paused: true, status: "", actionError: "" }),

  advanceWeek: () => {
    const { game, settings } = get();
    if (!game || game.gameOver) return;
    const next = tick(game);

    const newEvents = next.events.filter((e) => e.week === next.week);
    const important = newEvents.some((e) => e.important);
    const pause = Boolean(next.gameOver) || (settings.pauseOnImportant && important);
    if (next.achievements.length !== game.achievements.length) forwardAchievements(next);
    set(pause ? { game: next, paused: true } : { game: next });

    const every = settings.autosaveWeeks;
    if (every > 0 && next.week % every === 0) {
      saveGame(platform.saves, next, "auto").then(
        () => {
          if (get().game?.id === next.id) set({ status: "Autosaved." });
        },
        (e: unknown) => {
          if (get().game?.id === next.id) set({ status: `Autosave failed: ${String(e)}` });
        },
      );
    }
  },

  setSpeed: (speed) => set({ speed, paused: get().game?.gameOver ? true : false }),
  togglePause: () => set({ paused: get().game?.gameOver ? true : !get().paused }),
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

  dispatch: (action) => {
    const { game } = get();
    if (!game) return false;
    try {
      const next = action(game);
      if (next.achievements.length !== game.achievements.length) forwardAchievements(next);
      set({ game: next, actionError: "" });
      return true;
    } catch (e) {
      if (e instanceof ActionError) {
        set({ actionError: e.message });
        return false;
      }
      throw e;
    }
  },

  clearActionError: () => set({ actionError: "" }),
}));

/** The running game. Only use inside the Dashboard, where a game always exists. */
export function useGame(): GameState {
  const game = useStore((s) => s.game);
  if (!game) throw new Error("useGame() called without a running game");
  return game;
}
