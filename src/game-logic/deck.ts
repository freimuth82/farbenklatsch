import type { Card, DeckVariant, Rank, Suit } from './types';
import type { RandomSource } from './rng';

export const SUITS: readonly Suit[] = ['spades', 'clubs', 'hearts', 'diamonds'];

export const SKAT_RANKS: readonly Rank[] = [
  '7',
  '8',
  '9',
  '10',
  'jack',
  'queen',
  'king',
  'ace',
];

export const FULL52_RANKS: readonly Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'jack',
  'queen',
  'king',
  'ace',
];

export function ranksFor(variant: DeckVariant): readonly Rank[] {
  return variant === 'skat' ? SKAT_RANKS : FULL52_RANKS;
}

export function deckSizeFor(variant: DeckVariant): number {
  return ranksFor(variant).length * SUITS.length;
}

export function createDeck(variant: DeckVariant): Card[] {
  const ranks = ranksFor(variant);
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of ranks) {
      cards.push({ suit, rank });
    }
  }
  return cards;
}

/** Fisher-Yates shuffle. Pure: returns a new array, does not mutate the input. */
export function shuffle<T>(items: readonly T[], rng: RandomSource): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
