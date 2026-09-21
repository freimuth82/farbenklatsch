import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CardView } from '../card-view/card-view';
import { RANK_LABELS, SUIT_LABELS, SUIT_SYMBOLS, isRedSuit, playingCardGlyph } from '../card-view/card-labels';
import { GameSetupService } from '../start-screen/game-setup.service';
import { TestModeService } from '../test-mode';
import { createGame, createSeededRng, playCard, type Card, type EndType, type GameState, type PlayerId } from '../../game-logic';

/** Computer "thinks" for a moment before playing, so its move is not jarringly instant. */
const COMPUTER_MOVE_DELAY_MS = 700;

/** How long a played card takes to fly from a player's pile into the center. */
const PLAY_FLIGHT_MS = 350;

/** How long a won pile stays fully visible (with the winner-name banner) before the first card starts flying. */
const WIN_STATIC_VISIBLE_MS = 2400;

/** Delay between each card's flight start, so they leave the pile one after another instead of all at once. */
const CARD_STAGGER_MS = 120;

/** How long a single card's fly+flip animation takes. */
const CARD_FLIGHT_MS = 500;

/** How many offset card-backs to render for a pile, purely as a "there are cards here" visual. */
const MAX_PILE_STACK_LAYERS = 4;

const END_TYPE_LABELS: Record<EndType, string> = {
  regular: 'Reguläres Spielende',
  perfectMatch: 'Perfect Match',
  earlyConsensual: 'Vorzeitig beendet (einvernehmlich)',
  earlyForced: 'Vorzeitig beendet (erzwungen)',
  timeout: 'Beendet durch Zeitüberschreitung',
};

interface CollectingPile {
  winner: PlayerId;
  cards: Card[];
}

interface PlayingMove {
  player: PlayerId;
  card: Card;
}

interface HistoryEntryView {
  moveNumber: number;
  playerName: string;
  rankLabel: string;
  suitSymbol: string;
  suitLabel: string;
  suitIsRed: boolean;
  cardGlyph: string;
  pileWon: boolean;
  pileSize: number | null;
}

@Component({
  selector: 'app-game-screen',
  imports: [CardView],
  templateUrl: './game-screen.html',
  styleUrl: './game-screen.scss',
})
export class GameScreen {
  private readonly gameSetup = inject(GameSetupService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly testMode = inject(TestModeService);

  private readonly computerMoveDelayMs = this.testMode.fastMode ? 0 : COMPUTER_MOVE_DELAY_MS;

  protected readonly options = this.gameSetup.pendingOptions();
  protected readonly state = signal<GameState | null>(null);

  /** Non-null while a just-won pile is still being shown, before it is actually collected. */
  protected readonly collecting = signal<CollectingPile | null>(null);
  private collectTimeoutId: ReturnType<typeof setTimeout> | undefined;

  /** Non-null while a just-played card is still flying from its player's pile into the center. */
  protected readonly playingCard = signal<PlayingMove | null>(null);
  private playTimeoutId: ReturnType<typeof setTimeout> | undefined;

  protected readonly showHistory = signal(false);

  constructor() {
    if (this.options === null) {
      this.router.navigateByUrl('/');
      return;
    }

    const rng = createSeededRng(Date.now());
    this.state.set(
      createGame(
        {
          deckVariant: this.options.deckVariant,
          valueRuleEnabled: this.options.valueRuleEnabled,
          reactionTimeMs: this.options.reactionTimeMs,
        },
        rng,
      ),
    );

    // The computer's only "decision" is when to play (it never chooses which card,
    // that is fixed by pile order) - so this is just a delayed auto-tap of its own pile.
    effect((onCleanup) => {
      const current = this.state();
      if (
        current === null ||
        current.status !== 'inProgress' ||
        this.collecting() !== null ||
        this.playingCard() !== null
      ) {
        return;
      }
      const activePlayer = current.awaitingFinalMoveBy ?? current.turn;
      if (!this.isComputer(activePlayer)) {
        return;
      }
      const timeoutId = setTimeout(() => this.applyMove(activePlayer), this.computerMoveDelayMs);
      onCleanup(() => clearTimeout(timeoutId));
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.collectTimeoutId);
      clearTimeout(this.playTimeoutId);
    });
  }

  /**
   * Plays the given player's top card. The game-logic call itself is instant and
   * atomic (a won pile is already collected in the returned state) - but showing
   * that instantly would skip straight past two things a player should actually
   * see: the card traveling from the pile into the center, and - if it wins the
   * trick - the winning card and who just won. So the card is first shown flying
   * into the center (the *previous* state stays displayed as its actual pile-tap
   * source), and only once that lands is the game-logic move itself computed and,
   * if it won, held again for the existing collect animation. This is purely a
   * presentation delay; the game logic's own timing stays untouched.
   */
  private applyMove(player: PlayerId): void {
    const current = this.state();
    if (current === null) {
      return;
    }
    const playedCard = current.piles[player][0];
    this.playingCard.set({ player, card: playedCard });

    const playFlightMs = this.testMode.fastMode ? 0 : PLAY_FLIGHT_MS;
    this.playTimeoutId = setTimeout(() => {
      this.playingCard.set(null);
      this.finishMove(current, player, playedCard);
    }, playFlightMs);
  }

  private finishMove(current: GameState, player: PlayerId, playedCard: Card): void {
    const next = playCard(current, player, Date.now());
    const lastEvent = next.events.at(-1);

    if (lastEvent?.pileWon) {
      const wonCards = [...current.centerPile, playedCard];
      this.collecting.set({ winner: player, cards: wonCards });
      const collectDelayMs = this.testMode.fastMode
        ? 0
        : WIN_STATIC_VISIBLE_MS + Math.max(0, wonCards.length - 1) * CARD_STAGGER_MS + CARD_FLIGHT_MS;
      this.collectTimeoutId = setTimeout(() => {
        this.state.set(next);
        this.collecting.set(null);
      }, collectDelayMs);
    } else {
      this.state.set(next);
    }
  }

  protected isComputer(player: PlayerId): boolean {
    return this.options?.mode === 'vsComputer' && player === 'player2';
  }

  protected playerName(player: PlayerId): string {
    if (this.isComputer(player)) {
      return 'Computer';
    }
    return player === 'player1' ? (this.options?.player1Name ?? '') : (this.options?.player2Name ?? '');
  }

  protected isFacingSeating(): boolean {
    return this.options?.mode === 'twoHumans' && this.options.seating === 'facing';
  }

  protected isSideBySideSeating(): boolean {
    return this.options?.mode === 'twoHumans' && this.options.seating === 'sideBySide';
  }

  protected isActive(player: PlayerId): boolean {
    if (this.collecting() !== null || this.playingCard() !== null) {
      return false;
    }
    const s = this.state();
    if (s === null || s.status !== 'inProgress') {
      return false;
    }
    return (s.awaitingFinalMoveBy ?? s.turn) === player;
  }

  protected canTap(player: PlayerId): boolean {
    return this.isActive(player) && !this.isComputer(player);
  }

  protected onPileTap(player: PlayerId): void {
    if (!this.canTap(player)) {
      return;
    }
    this.applyMove(player);
  }

  /** The pile count to display: the acting player's card is already "gone" the moment they play it. */
  protected pileCount(player: PlayerId): number {
    const s = this.state();
    if (s === null) {
      return 0;
    }
    const collecting = this.collecting();
    if (collecting !== null && collecting.winner === player) {
      return s.piles[player].length - 1;
    }
    if (this.playingCard()?.player === player) {
      return s.piles[player].length - 1;
    }
    return s.piles[player].length;
  }

  protected centerPileCards(): readonly Card[] {
    const collecting = this.collecting();
    if (collecting !== null) {
      return collecting.cards;
    }
    return this.state()?.centerPile ?? [];
  }

  /**
   * Which way the center pile connects to a given player, given the current seating
   * layout. Must match the board's actual DOM/visual order: player2's block comes
   * first, so in the side-by-side row layout it renders on the left and player1
   * on the right; in the column layout (facing / vsComputer) player2 is on top.
   * Used both for a won pile flying out to the winner, and a played card flying
   * in from whoever just played it.
   */
  protected directionFor(player: PlayerId): 'up' | 'down' | 'left' | 'right' {
    if (this.isSideBySideSeating()) {
      return player === 'player2' ? 'left' : 'right';
    }
    return player === 'player2' ? 'up' : 'down';
  }

  protected flightDirection(): 'up' | 'down' | 'left' | 'right' {
    const winner = this.collecting()?.winner;
    return this.directionFor(winner ?? 'player1');
  }

  protected stackLayers(pileSize: number): number[] {
    const layers = Math.min(MAX_PILE_STACK_LAYERS, pileSize);
    return Array.from({ length: layers }, (_, i) => i);
  }

  protected endTypeLabel(endType: EndType): string {
    return END_TYPE_LABELS[endType];
  }

  /** Newest first, so the most recent move is visible without scrolling during live play. */
  protected historyEntries(): HistoryEntryView[] {
    const events = this.state()?.events ?? [];
    return events
      .map(
        (event, i): HistoryEntryView => ({
          moveNumber: i + 1,
          playerName: this.playerName(event.player),
          rankLabel: RANK_LABELS[event.card.rank],
          suitSymbol: SUIT_SYMBOLS[event.card.suit],
          suitLabel: SUIT_LABELS[event.card.suit],
          suitIsRed: isRedSuit(event.card.suit),
          cardGlyph: playingCardGlyph(event.card),
          pileWon: event.pileWon,
          pileSize: event.pileSize,
        }),
      )
      .reverse();
  }

  protected async newGame(): Promise<void> {
    await this.router.navigateByUrl('/');
  }
}
