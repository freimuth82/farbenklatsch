import type { Card, Rank, Suit } from '../../game-logic';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  clubs: '♣',
  hearts: '♥',
  diamonds: '♦',
};

export const SUIT_LABELS: Record<Suit, string> = {
  spades: 'Pik',
  clubs: 'Kreuz',
  hearts: 'Herz',
  diamonds: 'Karo',
};

export const RANK_LABELS: Record<Rank, string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  jack: 'Bube',
  queen: 'Dame',
  king: 'König',
  ace: 'Ass',
};

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

// Unicode "Playing Cards" block (U+1F0A0-U+1F0DF): one dedicated glyph per exact
// card, e.g. U+1F0A1 "PLAYING CARD ACE OF SPADES" (🂡). Each suit occupies a run of
// 14 code points (Ace, 2-10, Jack, Knight, Queen, King) - we skip the Knight offset
// since it has no equivalent in a French-suited deck.
const SUIT_BLOCK_BASE: Record<Suit, number> = {
  spades: 0x1f0a0,
  hearts: 0x1f0b0,
  diamonds: 0x1f0c0,
  clubs: 0x1f0d0,
};

const RANK_BLOCK_OFFSET: Record<Rank, number> = {
  ace: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  jack: 11,
  queen: 13,
  king: 14,
};

export function playingCardGlyph(card: Card): string {
  return String.fromCodePoint(SUIT_BLOCK_BASE[card.suit] + RANK_BLOCK_OFFSET[card.rank]);
}
