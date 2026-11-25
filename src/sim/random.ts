// Random helpers that draw from GameState.rngState (D-009). They mutate the
// state they are given, so only call them on a working copy (see tick and
// actions, which clone the state first).

import { nextRandom } from "./rng";
import type { GameState } from "./types";

export function random(s: GameState): number {
  const [value, next] = nextRandom(s.rngState);
  s.rngState = next;
  return value;
}

export function uniform(s: GameState, min: number, max: number): number {
  return min + random(s) * (max - min);
}

/** Integer in [min, max], inclusive. */
export function randInt(s: GameState, min: number, max: number): number {
  return Math.floor(uniform(s, min, max + 1));
}

export function chance(s: GameState, p: number): boolean {
  return random(s) < p;
}

export function pick<T>(s: GameState, items: readonly T[]): T {
  return items[Math.floor(random(s) * items.length)];
}

/** Picks an item with probability proportional to its weight. */
export function pickWeighted<T>(s: GameState, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let r = random(s) * total;
  for (const item of items) {
    r -= weight(item);
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

export function newId(s: GameState, prefix: string): string {
  const id = `${prefix}${s.nextId}`;
  s.nextId += 1;
  return id;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
