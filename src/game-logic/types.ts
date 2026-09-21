export type Suit = 'spades' | 'clubs' | 'hearts' | 'diamonds';

export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'jack'
  | 'queen'
  | 'king'
  | 'ace';

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

export type DeckVariant = 'skat' | 'full52';

export type PlayerId = 'player1' | 'player2';

export interface GameConfig {
  readonly deckVariant: DeckVariant;
  readonly valueRuleEnabled: boolean;
  /** Max allowed idle time in ms between a played card and the opponent's next move, or null for unlimited. */
  readonly reactionTimeMs: number | null;
}

export type EndType =
  | 'regular'
  | 'perfectMatch'
  | 'earlyConsensual'
  | 'earlyForced'
  | 'timeout';

export interface GameResult {
  readonly endType: EndType;
  /** null only for a draw, which is only possible on an early/timeout end. */
  readonly winner: PlayerId | null;
  readonly cardCounts: Readonly<Record<PlayerId, number>>;
}

export interface CardPlayedEvent {
  readonly type: 'cardPlayed';
  readonly player: PlayerId;
  readonly card: Card;
  readonly timestamp: number;
  readonly pileWon: boolean;
  readonly pileSize: number | null;
  readonly cardCountsAfter: Readonly<Record<PlayerId, number>>;
}

export type GameEvent = CardPlayedEvent;

export interface PendingEarlyEnd {
  readonly requestedBy: PlayerId;
  readonly requestedAt: number;
  readonly declined: boolean;
  readonly declinedAt: number | null;
}

export interface GameStats {
  readonly totalCardsPlayed: number;
  readonly tricksWon: Readonly<Record<PlayerId, number>>;
  readonly largestPileWon: Readonly<Record<PlayerId, number>>;
}

export const PLAYER_IDS: readonly PlayerId[] = ['player1', 'player2'];

export function otherPlayer(player: PlayerId): PlayerId {
  return player === 'player1' ? 'player2' : 'player1';
}

export interface GameState {
  readonly config: GameConfig;
  readonly piles: Readonly<Record<PlayerId, readonly Card[]>>;
  /** Cards played this trick, in play order; centerPile[0] is the trick-defining card. Empty between tricks. */
  readonly centerPile: readonly Card[];
  readonly requiredSuit: Suit | null;
  readonly requiredRank: Rank | null;
  readonly turn: PlayerId;
  readonly events: readonly GameEvent[];
  readonly stats: GameStats;
  readonly status: 'inProgress' | 'finished';
  readonly result: GameResult | null;
  /** Set once a player has emptied their pile; the other player owes exactly one more forced move. */
  readonly awaitingFinalMoveBy: PlayerId | null;
  readonly pendingEarlyEnd: PendingEarlyEnd | null;
}
