// Seeded pseudo-random number generator (mulberry32), D-009.
// The generator state lives in GameState.rngState, so a loaded save
// continues with exactly the same sequence of random numbers.

/** Returns a float in [0, 1) and the next generator state. */
export function nextRandom(state: number): [value: number, nextState: number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Normalises any number into a valid 32-bit generator seed. */
export function seedToState(seed: number): number {
  return seed | 0;
}
