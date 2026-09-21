import { Injectable, signal } from '@angular/core';
import type { StartOptions } from './start-options.model';

/**
 * Hands the chosen start options from the start screen to the game screen across
 * navigation. The game screen creates the actual GameState from these on init.
 */
@Injectable({ providedIn: 'root' })
export class GameSetupService {
  readonly pendingOptions = signal<StartOptions | null>(null);

  startGame(options: StartOptions): void {
    this.pendingOptions.set(options);
  }
}
