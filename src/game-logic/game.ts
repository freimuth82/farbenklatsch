import { createDeck, shuffle } from './deck';
import { rollDie, type RandomSource } from './rng';
import {
  otherPlayer,
  type Card,
  type CardPlayedEvent,
  type GameConfig,
  type GameResult,
  type GameStats,
  type GameState,
  type PlayerId,
} from './types';

function assertInProgress(state: GameState): void {
  if (state.status !== 'inProgress') {
    throw new Error('This game has already finished.');
  }
}

function countCards(piles: Readonly<Record<PlayerId, readonly Card[]>>): Record<PlayerId, number> {
  return { player1: piles.player1.length, player2: piles.player2.length };
}

/** Deals the shuffled deck and rolls off (with rerolls on a tie) for the starting player, as one atomic step. */
export function createGame(config: GameConfig, rng: RandomSource): GameState {
  const deck = shuffle(createDeck(config.deckVariant), rng);
  const half = deck.length / 2;
  const piles: Record<PlayerId, Card[]> = {
    player1: deck.slice(0, half),
    player2: deck.slice(half),
  };

  let starter: PlayerId;
  for (;;) {
    const roll1 = rollDie(rng);
    const roll2 = rollDie(rng);
    if (roll1 !== roll2) {
      starter = roll1 > roll2 ? 'player1' : 'player2';
      break;
    }
  }

  return {
    config,
    piles,
    centerPile: [],
    requiredSuit: null,
    requiredRank: null,
    turn: starter,
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
  };
}

/**
 * The given player taps their pile: reveals (and plays) their top card.
 * Handles trick-starts, match attempts, pile wins, running out of cards, and the
 * resulting forced final move (regular end vs. Perfect Match) uniformly.
 */
export function playCard(state: GameState, player: PlayerId, now: number): GameState {
  assertInProgress(state);
  if (state.pendingEarlyEnd !== null) {
    throw new Error('Cannot play while an early-end request is pending.');
  }

  const isFinalForcedMove = state.awaitingFinalMoveBy === player;
  if (state.awaitingFinalMoveBy !== null) {
    if (!isFinalForcedMove) {
      throw new Error(`Only ${state.awaitingFinalMoveBy} may make the final move.`);
    }
  } else if (player !== state.turn) {
    throw new Error(`It is not ${player}'s turn.`);
  }

  const pile = state.piles[player];
  if (pile.length === 0) {
    throw new Error(`${player} has no cards left to play.`);
  }

  const card = pile[0];
  const restOfPile = pile.slice(1);
  const trickStart = state.centerPile.length === 0;
  const newCenterPile = [...state.centerPile, card];
  const matches =
    !trickStart &&
    (card.suit === state.requiredSuit ||
      (state.config.valueRuleEnabled && card.rank === state.requiredRank));

  const requiredSuit = trickStart ? card.suit : state.requiredSuit;
  const requiredRank = trickStart ? card.rank : state.requiredRank;

  if (matches) {
    const wonPileSize = newCenterPile.length;
    const piles = { ...state.piles, [player]: [...restOfPile, ...newCenterPile] };
    const cardCountsAfter = countCards(piles);
    const stats: GameStats = {
      totalCardsPlayed: state.stats.totalCardsPlayed + 1,
      tricksWon: { ...state.stats.tricksWon, [player]: state.stats.tricksWon[player] + 1 },
      largestPileWon: {
        ...state.stats.largestPileWon,
        [player]: Math.max(state.stats.largestPileWon[player], wonPileSize),
      },
    };
    const event: CardPlayedEvent = {
      type: 'cardPlayed',
      player,
      card,
      timestamp: now,
      pileWon: true,
      pileSize: wonPileSize,
      cardCountsAfter,
    };
    const events = [...state.events, event];

    if (isFinalForcedMove) {
      const result: GameResult = { endType: 'perfectMatch', winner: player, cardCounts: cardCountsAfter };
      return {
        ...state,
        piles,
        centerPile: [],
        requiredSuit: null,
        requiredRank: null,
        turn: player,
        events,
        stats,
        status: 'finished',
        result,
        awaitingFinalMoveBy: null,
      };
    }

    return {
      ...state,
      piles,
      centerPile: [],
      requiredSuit: null,
      requiredRank: null,
      turn: player,
      events,
      stats,
      awaitingFinalMoveBy: null,
    };
  }

  const piles = { ...state.piles, [player]: restOfPile };
  const cardCountsAfter = countCards(piles);
  const stats: GameStats = { ...state.stats, totalCardsPlayed: state.stats.totalCardsPlayed + 1 };
  const event: CardPlayedEvent = {
    type: 'cardPlayed',
    player,
    card,
    timestamp: now,
    pileWon: false,
    pileSize: null,
    cardCountsAfter,
  };
  const events = [...state.events, event];

  if (isFinalForcedMove) {
    const result: GameResult = { endType: 'regular', winner: player, cardCounts: cardCountsAfter };
    return {
      ...state,
      piles,
      centerPile: newCenterPile,
      requiredSuit,
      requiredRank,
      turn: player,
      events,
      stats,
      status: 'finished',
      result,
      awaitingFinalMoveBy: null,
    };
  }

  if (restOfPile.length === 0) {
    return {
      ...state,
      piles,
      centerPile: newCenterPile,
      requiredSuit,
      requiredRank,
      turn: otherPlayer(player),
      events,
      stats,
      awaitingFinalMoveBy: otherPlayer(player),
    };
  }

  return {
    ...state,
    piles,
    centerPile: newCenterPile,
    requiredSuit,
    requiredRank,
    turn: otherPlayer(player),
    events,
    stats,
  };
}

function finalizeByCardCount(state: GameState, endType: 'earlyConsensual' | 'earlyForced' | 'timeout'): GameState {
  const cardCounts = countCards(state.piles);
  const winner: PlayerId | null =
    cardCounts.player1 === cardCounts.player2
      ? null
      : cardCounts.player1 > cardCounts.player2
        ? 'player1'
        : 'player2';
  const result: GameResult = { endType, winner, cardCounts };
  return { ...state, status: 'finished', result, pendingEarlyEnd: null };
}

/** The requesting player (the "Herausforderer") asks to end the game early. */
export function requestEarlyEnd(state: GameState, requester: PlayerId, now: number): GameState {
  assertInProgress(state);
  if (state.awaitingFinalMoveBy !== null) {
    throw new Error('Cannot request an early end once the game is already resolving.');
  }
  if (state.pendingEarlyEnd !== null) {
    throw new Error('An early-end request is already pending.');
  }
  return {
    ...state,
    pendingEarlyEnd: { requestedBy: requester, requestedAt: now, declined: false, declinedAt: null },
  };
}

/**
 * The other player responds to a pending early-end request.
 * Accepting also covers the "60s elapsed without a response" case — the surrounding
 * layer decides *when* to call this with 'accept', the rule ("gilt als angenommen")
 * makes no scoring distinction between an explicit accept and a lapsed timer.
 */
export function respondToEarlyEnd(
  state: GameState,
  decision: 'accept' | 'decline',
  now: number,
): GameState {
  assertInProgress(state);
  if (state.pendingEarlyEnd === null) {
    throw new Error('There is no pending early-end request to respond to.');
  }
  if (decision === 'accept') {
    return finalizeByCardCount(state, 'earlyConsensual');
  }
  return {
    ...state,
    pendingEarlyEnd: { ...state.pendingEarlyEnd, declined: true, declinedAt: now },
  };
}

/**
 * The original requester forces the end after a decline. The surrounding layer is
 * responsible for having waited the required 15s since the decline before calling this.
 */
export function forceEarlyEnd(state: GameState): GameState {
  assertInProgress(state);
  if (state.pendingEarlyEnd === null || !state.pendingEarlyEnd.declined) {
    throw new Error('Can only force an early end after the opponent has declined.');
  }
  return finalizeByCardCount(state, 'earlyForced');
}

/** Pure query: has more than config.reactionTimeMs elapsed since the last move (or game start)? */
export function hasReactionTimedOut(state: GameState, now: number): boolean {
  if (state.config.reactionTimeMs === null || state.status !== 'inProgress') {
    return false;
  }
  const lastEvent = state.events.at(-1);
  const lastMoveAt = lastEvent?.timestamp ?? 0;
  return now - lastMoveAt > state.config.reactionTimeMs;
}

/** The waiting player chooses to end the game because the opponent exceeded the reaction time. */
export function endGameByTimeout(state: GameState, now: number): GameState {
  assertInProgress(state);
  if (!hasReactionTimedOut(state, now)) {
    throw new Error('The reaction time has not been exceeded.');
  }
  return finalizeByCardCount(state, 'timeout');
}
