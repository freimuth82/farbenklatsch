import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TestModeService } from './test-mode';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  // Injected here (not just where it's used) so it is constructed while the
  // initial URL - and its ?fastMode=1 flag, if any - is still current.
  private readonly testMode = inject(TestModeService);
}
