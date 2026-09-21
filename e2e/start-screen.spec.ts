import { expect, test } from '@playwright/test';

test('vs-computer mode only needs one name and reaches the game screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Farbenklatsch' })).toBeVisible();

  // vsComputer is the default; player2 fields must not be present.
  await expect(page.locator('#player2Name')).toHaveCount(0);

  await page.locator('#player1Name').fill('Alex');
  await page.getByRole('button', { name: 'Spiel starten' }).click();

  await expect(page).toHaveURL(/\/spiel$/);
  await expect(page.locator('.game-screen__player-name', { hasText: 'Alex' })).toBeVisible();
  await expect(page.locator('.game-screen__player-name', { hasText: 'Computer' })).toBeVisible();
});

test('two-humans mode requires both names and shows seating, radios behave as a real group', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Zwei Menschen an einem Gerät').check();

  await expect(page.locator('#player2Name')).toBeVisible();
  await expect(page.getByLabel('Gegenüber')).toBeChecked();
  await expect(page.getByLabel('Nebeneinander')).not.toBeChecked();
  await page.getByLabel('Nebeneinander').check();
  await expect(page.getByLabel('Gegenüber')).not.toBeChecked();

  // Submitting without names shows validation errors and does not navigate.
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page.locator('#player1Name-error')).toBeVisible();
  await expect(page.locator('#player2Name-error')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  await page.locator('#player1Name').fill('Alex');
  await page.locator('#player2Name').fill('Sam');
  await page.getByRole('button', { name: 'Spiel starten' }).click();

  await expect(page).toHaveURL(/\/spiel$/);
  await expect(page.locator('.game-screen__player-name', { hasText: 'Alex' })).toBeVisible();
  await expect(page.locator('.game-screen__player-name', { hasText: 'Sam' })).toBeVisible();
});

test('deck variant radios are mutually exclusive', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Skatblatt (32 Karten)')).toBeChecked();
  await page.getByLabel('Klassisches Deck (52 Karten)').check();
  await expect(page.getByLabel('Skatblatt (32 Karten)')).not.toBeChecked();
});

test('navigating directly to /spiel without setup redirects home', async ({ page }) => {
  await page.goto('/spiel');
  await expect(page).toHaveURL(/\/$/);
});

test('player names are remembered in localStorage for the next game, including player 2', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Zwei Menschen an einem Gerät').check();
  await page.locator('#player1Name').fill('Alex');
  await page.locator('#player2Name').fill('Sam');
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page).toHaveURL(/\/spiel$/);

  await page.goto('/');
  await page.getByLabel('Zwei Menschen an einem Gerät').check();
  await expect(page.locator('#player1Name')).toHaveValue('Alex');
  await expect(page.locator('#player2Name')).toHaveValue('Sam');
});

test('a fresh browser (no stored names) starts with empty name fields', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#player1Name')).toHaveValue('');
});

test('the rules link leads to a Spielanleitung page covering the actual rules, with a way back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Spielanleitung' }).click();
  await expect(page).toHaveURL(/\/regeln$/);
  await expect(page.getByRole('heading', { name: 'Spielanleitung' })).toBeVisible();

  // Must cover the actual implemented end conditions, not just the basic flow.
  await expect(page.getByRole('heading', { name: 'Perfect Match' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vorzeitig' })).toBeVisible();
  await expect(page.getByText('Skatblatt')).toBeVisible();

  await page.getByRole('link', { name: 'Zurück zum Start' }).first().click();
  await expect(page).toHaveURL(/\/$/);
});
