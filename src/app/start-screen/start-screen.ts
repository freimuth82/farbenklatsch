import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, form, required } from '@angular/forms/signals';
import { GameSetupService } from './game-setup.service';
import { loadStoredPlayerNames, storePlayerNames } from './player-name-storage';
import { DEFAULT_START_OPTIONS, type StartOptions } from './start-options.model';

@Component({
  selector: 'app-start-screen',
  imports: [FormField, RouterLink],
  templateUrl: './start-screen.html',
  styleUrl: './start-screen.scss',
})
export class StartScreen {
  private readonly gameSetup = inject(GameSetupService);
  private readonly router = inject(Router);

  protected readonly submitted = signal(false);

  protected readonly model = signal<StartOptions>({
    ...DEFAULT_START_OPTIONS,
    ...loadStoredPlayerNames(),
  });

  protected readonly optionsForm = form(this.model, (path) => {
    required(path.player1Name, { message: 'Bitte einen Namen eingeben' });
    required(path.player2Name, {
      when: ({ valueOf }) => valueOf(path.mode) === 'twoHumans',
      message: 'Bitte einen Namen eingeben',
    });
  });

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);

    if (this.optionsForm().invalid()) {
      return;
    }

    storePlayerNames({
      player1Name: this.model().player1Name,
      player2Name: this.model().player2Name,
    });
    this.gameSetup.startGame(this.model());
    await this.router.navigateByUrl('/spiel');
  }
}
