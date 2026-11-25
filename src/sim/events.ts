import { MAX_EVENTS } from "../data/balance";
import type { GameState } from "./types";

/** Adds an event to the log of a working copy of the state (mutates). */
export function addEvent(s: GameState, message: string, important = false): void {
  s.events.push(important ? { week: s.week, message, important } : { week: s.week, message });
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
}

export function unlockAchievement(s: GameState, id: string): void {
  if (!s.achievements.includes(id)) s.achievements.push(id);
}
