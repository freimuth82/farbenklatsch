import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./start-screen/start-screen').then((m) => m.StartScreen),
  },
  {
    path: 'spiel',
    loadComponent: () => import('./game-screen/game-screen').then((m) => m.GameScreen),
  },
  {
    path: 'regeln',
    loadComponent: () => import('./rules-page/rules-page').then((m) => m.RulesPage),
  },
];
