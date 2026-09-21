import type { DeckVariant } from '../../game-logic';

export type GameMode = 'vsComputer' | 'twoHumans';
export type Seating = 'facing' | 'sideBySide';

export interface StartOptions {
  mode: GameMode;
  player1Name: string;
  player2Name: string;
  seating: Seating;
  deckVariant: DeckVariant;
  valueRuleEnabled: boolean;
  /** null = unbegrenzt. No other durations are decided yet, see CLAUDE.md "Noch nicht festgelegt". */
  reactionTimeMs: number | null;
}

export const DEFAULT_START_OPTIONS: StartOptions = {
  mode: 'vsComputer',
  player1Name: '',
  player2Name: '',
  seating: 'facing',
  deckVariant: 'skat',
  valueRuleEnabled: false,
  reactionTimeMs: null,
};
