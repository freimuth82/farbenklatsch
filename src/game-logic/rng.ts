/** A source of randomness producing floats in [0, 1). Swappable so simulations stay reproducible. */
export type RandomSource = () => number;

/**
 * Mulberry32 PRNG. Deterministic for a given seed, which is what the simulation
 * and replay requirements need — Math.random() can't be seeded.
 */
export function createSeededRng(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [1, sides], using the given random source (default: a 6-sided die). */
export function rollDie(rng: RandomSource, sides = 6): number {
  return Math.floor(rng() * sides) + 1;
}
