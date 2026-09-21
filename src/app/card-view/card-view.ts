import { Component, computed, input } from '@angular/core';
import type { Card } from '../../game-logic';
import { RANK_LABELS, SUIT_LABELS, SUIT_SYMBOLS, isRedSuit } from './card-labels';

@Component({
  selector: 'app-card-view',
  templateUrl: './card-view.html',
  styleUrl: './card-view.scss',
  host: {
    class: 'card-view',
  },
})
export class CardView {
  readonly card = input<Card | null>(null);
  readonly faceDown = input(false);

  protected readonly isFaceDown = computed(() => this.faceDown() || this.card() === null);
  protected readonly symbol = computed(() => {
    const c = this.card();
    return c ? SUIT_SYMBOLS[c.suit] : '';
  });
  protected readonly rankLabel = computed(() => {
    const c = this.card();
    return c ? RANK_LABELS[c.rank] : '';
  });
  protected readonly isRed = computed(() => {
    const c = this.card();
    return c ? isRedSuit(c.suit) : false;
  });
  protected readonly ariaLabel = computed(() => {
    const c = this.card();
    return this.isFaceDown() || !c ? 'Verdeckte Karte' : `${RANK_LABELS[c.rank]} ${SUIT_LABELS[c.suit]}`;
  });
}
