import { Injectable } from '@angular/core';

/**
 * Detects the `?fastMode=1` URL flag, read once at app startup (before any routing
 * strips query params) and cached for the whole session. Used to skip UI-only
 * delays (computer "thinking" time, trick-collection delay) in e2e tests - these
 * numbers are purely presentational and have no effect on the game logic or the
 * (UI-less) simulation script, so there is nothing to keep realistic about them
 * for automated runs.
 */
@Injectable({ providedIn: 'root' })
export class TestModeService {
  readonly fastMode = new URLSearchParams(window.location.search).get('fastMode') === '1';
}
