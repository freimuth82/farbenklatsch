import { describe, expect, it } from 'vitest';
import { createDeck, deckSizeFor } from './deck';
import {
  createGame,
  endGameByTimeout,
  forceEarlyEnd,
  hasReactionTimedOut,
  playCard,
  requestEarlyEnd,
  respondToEarlyEnd,
} from './game';
import { createSeededRng } from './rng';
import type { Card, GameConfig, GameState } from './types';

const baseConfig: GameConfig = {
  deckVariant: 'skat',
  valueRuleEnabled: false,
  reactionTimeMs: null,
};

function card(suit: Card['suit'], rank: Card['rank']): Card {
  return { suit, rank };
}

/** Hand-built state for deterministic unit tests, bypassing shuffle/dice randomness. */
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    config: baseConfig,
    piles: { player1: [], player2: [] },
    centerPile: [],
    requiredSuit: null,
    requiredRank: null,
    turn: 'player1',
    events: [],
    stats: {
      totalCardsPlayed: 0,
      tricksWon: { player1: 0, player2: 0 },
      largestPileWon: { player1: 0, player2: 0 },
    },
    status: 'inProgress',
    result: null,
    awaitingFinalMoveBy: null,
    pendingEarlyEnd: null,
    ...overrides,
  };
}

describe('deck', () => {
  it('creates a 32-card Skat deck with no duplicates', () => {
    const deck = createDeck('skat');
    expect(deck).toHaveLength(32);
    expect(new Set(deck.map((c) => `${c.suit}-${c.rank}`)).size).toBe(32);
    expect(deckSizeFor('skat')).toBe(32);
  });

  it('creates a 52-card full deck with no duplicates', () => {
    const deck = createDeck('full52');
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => `${c.suit}-${c.rank}`)).size).toBe(52);
    expect(deckSizeFor('full52')).toBe(52);
  });
});

describe('createSeededRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    expect(a()).not.toBe(b());
  });
});

describe('createGame', () => {
  it('deals all cards evenly and starts in progress with an empty event log', () => {
    const state = createGame(baseConfig, createSeededRng(7));
    expect(state.piles.player1).toHaveLength(16);
    expect(state.piles.player2).toHaveLength(16);
    expect(state.status).toBe('inProgress');
    expect(state.events).toEqual([]);
    expect(['player1', 'player2']).toContain(state.turn);
  });

  it('is reproducible for the same seed', () => {
    const a = createGame(baseConfig, createSeededRng(123));
    const b = createGame(baseConfig, createSeededRng(123));
    expect(a.piles).toEqual(b.piles);
    expect(a.turn).toBe(b.turn);
  });
});

describe('playCard - trick flow', () => {
  it('starting a trick sets the required suit and passes the turn without a win', () => {
    const state = makeState({
      piles: { player1: [card('hearts', '7')], player2: [card('spades', '8')] },
      turn: 'player1',
    });
    const next = playCard(state, 'player1', 1000);
    expect(next.centerPile).toEqual([card('hearts', '7')]);
    expect(next.requiredSuit).toBe('hearts');
    expect(next.turn).toBe('player2');
    expect(next.events).toHaveLength(1);
    expect(next.events[0]).toMatchObject({ player: 'player1', pileWon: false, pileSize: null });
  });

  it('a matching suit wins the whole pile, pushed to the bottom in play order, winner goes again', () => {
    const state = makeState({
      piles: {
        player1: [card('clubs', '9')],
        player2: [card('hearts', 'king'), card('spades', 'ace')],
      },
      centerPile: [card('hearts', '7'), card('clubs', '9')],
      requiredSuit: 'hearts',
      turn: 'player2',
    });
    const next = playCard(state, 'player2', 2000);
    expect(next.centerPile).toEqual([]);
    expect(next.piles.player2).toEqual([
      card('spades', 'ace'),
      card('hearts', '7'),
      card('clubs', '9'),
      card('hearts', 'king'),
    ]);
    expect(next.turn).toBe('player2');
    expect(next.stats.tricksWon.player2).toBe(1);
    expect(next.stats.largestPileWon.player2).toBe(3);
    expect(next.events[0]).toMatchObject({ pileWon: true, pileSize: 3 });
  });

  it('a non-matching suit does not win and passes the turn', () => {
    const state = makeState({
      piles: { player1: [card('spades', '9')], player2: [] },
      centerPile: [card('hearts', '7')],
      requiredSuit: 'hearts',
      turn: 'player1',
    });
    const next = playCard(state, 'player1', 3000);
    expect(next.centerPile).toEqual([card('hearts', '7'), card('spades', '9')]);
    expect(next.turn).toBe('player2');
  });

  it('the value rule also wins the pile on a matching rank of a different suit', () => {
    const config: GameConfig = { ...baseConfig, valueRuleEnabled: true };
    const state = makeState({
      config,
      piles: { player1: [card('spades', '7')], player2: [] },
      centerPile: [card('clubs', '7'), card('hearts', 'king')],
      requiredSuit: 'clubs',
      requiredRank: '7',
      turn: 'player1',
    });
    const next = playCard(state, 'player1', 4000);
    expect(next.piles.player1.length).toBeGreaterThan(0);
    expect(next.events[0]).toMatchObject({ pileWon: true, pileSize: 3 });
  });
});

describe('regular end and Perfect Match', () => {
  function setupNearEnd() {
    // player1 is down to one card, about to attempt a (failing) match.
    return makeState({
      piles: {
        player1: [card('spades', '9')],
        player2: [card('clubs', 'king'), card('hearts', 'ace')],
      },
      centerPile: [card('hearts', '7')],
      requiredSuit: 'hearts',
      turn: 'player1',
    });
  }

  it('the losing player running out triggers a pending forced final move, not an immediate end', () => {
    const state = setupNearEnd();
    const next = playCard(state, 'player1', 5000);
    expect(next.status).toBe('inProgress');
    expect(next.piles.player1).toEqual([]);
    expect(next.awaitingFinalMoveBy).toBe('player2');
    expect(next.turn).toBe('player2');
  });

  it('a non-matching forced final move ends the game regularly with the winner\'s remaining hand as the score', () => {
    const afterRunOut = playCard(setupNearEnd(), 'player1', 5000);
    const final = playCard(afterRunOut, 'player2', 5100);
    expect(final.status).toBe('finished');
    expect(final.result).toMatchObject({
      endType: 'regular',
      winner: 'player2',
      cardCounts: { player1: 0, player2: 1 },
    });
  });

  it('a matching forced final move is a Perfect Match sweeping every card', () => {
    // Same setup, but player2's remaining card matches the required suit.
    const state = makeState({
      piles: {
        player1: [card('spades', '9')],
        player2: [card('hearts', 'king')],
      },
      centerPile: [card('hearts', '7')],
      requiredSuit: 'hearts',
      turn: 'player1',
    });
    const afterRunOut = playCard(state, 'player1', 6000);
    const final = playCard(afterRunOut, 'player2', 6100);
    expect(final.status).toBe('finished');
    expect(final.result).toMatchObject({ endType: 'perfectMatch', winner: 'player2' });
    expect(final.result?.cardCounts.player2).toBe(3);
  });

  it('if the losing move itself matches, the player collects the pile and keeps playing instead of losing', () => {
    const state = makeState({
      piles: { player1: [card('hearts', '9')], player2: [card('spades', 'ace')] },
      centerPile: [card('hearts', '7')],
      requiredSuit: 'hearts',
      turn: 'player1',
    });
    const next = playCard(state, 'player1', 7000);
    expect(next.status).toBe('inProgress');
    expect(next.piles.player1).toHaveLength(2);
    expect(next.awaitingFinalMoveBy).toBeNull();
  });
});

describe('early end', () => {
  function endableState(): GameState {
    return makeState({
      piles: {
        player1: [card('spades', '2'), card('spades', '3')],
        player2: [card('hearts', '2')],
      },
      turn: 'player1',
    });
  }

  it('an explicit accept ends the game with the player with more cards winning', () => {
    const requested = requestEarlyEnd(endableState(), 'player1', 1000);
    const final = respondToEarlyEnd(requested, 'accept', 1500);
    expect(final.status).toBe('finished');
    expect(final.result).toMatchObject({ endType: 'earlyConsensual', winner: 'player1' });
  });

  it('a decline followed by a forced end is tagged earlyForced with the same scoring', () => {
    const requested = requestEarlyEnd(endableState(), 'player1', 1000);
    const declined = respondToEarlyEnd(requested, 'decline', 1200);
    expect(declined.status).toBe('inProgress');
    const forced = forceEarlyEnd(declined);
    expect(forced.result).toMatchObject({ endType: 'earlyForced', winner: 'player1' });
  });

  it('cannot be forced without a prior decline', () => {
    const requested = requestEarlyEnd(endableState(), 'player1', 1000);
    expect(() => forceEarlyEnd(requested)).toThrow();
  });

  it('equal card counts result in a draw (null winner)', () => {
    const tied = makeState({
      piles: { player1: [card('spades', '2')], player2: [card('hearts', '2')] },
    });
    const requested = requestEarlyEnd(tied, 'player1', 1000);
    const final = respondToEarlyEnd(requested, 'accept', 1500);
    expect(final.result?.winner).toBeNull();
  });

  it('blocks card plays while a request is pending', () => {
    const state = makeState({
      piles: { player1: [card('spades', '2')], player2: [card('hearts', '2')] },
      turn: 'player1',
    });
    const requested = requestEarlyEnd(state, 'player1', 1000);
    expect(() => playCard(requested, 'player1', 1100)).toThrow();
  });
});

describe('reaction timeout', () => {
  it('reports no timeout when unlimited', () => {
    const state = makeState({ config: baseConfig, events: [] });
    expect(hasReactionTimedOut(state, 999999)).toBe(false);
  });

  it('reports a timeout once the configured limit has elapsed since the last move', () => {
    const config: GameConfig = { ...baseConfig, reactionTimeMs: 60_000 };
    const state = makeState({
      config,
      events: [
        {
          type: 'cardPlayed',
          player: 'player1',
          card: card('hearts', '7'),
          timestamp: 1000,
          pileWon: false,
          pileSize: null,
          cardCountsAfter: { player1: 0, player2: 0 },
        },
      ],
    });
    expect(hasReactionTimedOut(state, 1000 + 60_000)).toBe(false);
    expect(hasReactionTimedOut(state, 1000 + 60_001)).toBe(true);
  });

  it('endGameByTimeout scores like an early end and refuses if not actually timed out', () => {
    const config: GameConfig = { ...baseConfig, reactionTimeMs: 1000 };
    const state = makeState({
      config,
      piles: { player1: [card('spades', '2'), card('spades', '3')], player2: [card('hearts', '2')] },
      events: [
        {
          type: 'cardPlayed',
          player: 'player2',
          card: card('hearts', '9'),
          timestamp: 0,
          pileWon: false,
          pileSize: null,
          cardCountsAfter: { player1: 2, player2: 1 },
        },
      ],
    });
    expect(() => endGameByTimeout(state, 500)).toThrow();
    const final = endGameByTimeout(state, 1001);
    expect(final.result).toMatchObject({ endType: 'timeout', winner: 'player1' });
  });
});
