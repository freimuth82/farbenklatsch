import { describe, expect, it } from 'vitest';
import { playingCardGlyph } from './card-labels';

describe('playingCardGlyph', () => {
  it('matches the documented Unicode "Playing Cards" code points', () => {
    expect(playingCardGlyph({ suit: 'spades', rank: 'ace' })).toBe(String.fromCodePoint(0x1f0a1));
    expect(playingCardGlyph({ suit: 'spades', rank: 'king' })).toBe(String.fromCodePoint(0x1f0ae));
    expect(playingCardGlyph({ suit: 'hearts', rank: 'jack' })).toBe(String.fromCodePoint(0x1f0bb));
    expect(playingCardGlyph({ suit: 'diamonds', rank: 'queen' })).toBe(String.fromCodePoint(0x1f0cd));
    expect(playingCardGlyph({ suit: 'clubs', rank: '7' })).toBe(String.fromCodePoint(0x1f0d7));
    expect(playingCardGlyph({ suit: 'clubs', rank: '10' })).toBe(String.fromCodePoint(0x1f0da));
  });

  it('never lands on the skipped "Knight" offset', () => {
    const knightOffsets = [0x1f0ac, 0x1f0bc, 0x1f0cc, 0x1f0dc];
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      for (const rank of ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'] as const) {
        const glyph = playingCardGlyph({ suit, rank });
        expect(knightOffsets).not.toContain(glyph.codePointAt(0));
      }
    }
  });
});
