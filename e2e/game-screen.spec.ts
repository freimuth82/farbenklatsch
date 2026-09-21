import { expect, type Page } from '@playwright/test';
import { test } from '@playwright/test';

/**
 * Most tests don't care about the real 700ms computer-move / 3s trick-collection
 * delays - only about the mechanics they gate. `?fastMode=1` (see TestModeService)
 * collapses both to 0 so those tests run quickly and reliably. The two tests that
 * specifically verify the *timing itself* deliberately pass fast=false to keep
 * using the real delays - otherwise they would not be testing anything.
 */
async function startVsComputer(page: Page, name = 'Alex', fast = true) {
  await page.goto(fast ? '/?fastMode=1' : '/');
  await page.locator('#player1Name').fill(name);
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page).toHaveURL(/\/spiel/);
}

async function startTwoHumansSideBySide(page: Page, fast = true) {
  await page.goto(fast ? '/?fastMode=1' : '/');
  await page.getByLabel('Zwei Menschen an einem Gerät').check();
  await page.locator('#player1Name').fill('Alex');
  await page.locator('#player2Name').fill('Sam');
  await page.getByLabel('Nebeneinander').check();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page).toHaveURL(/\/spiel/);
}

async function startTwoHumansFacing(page: Page, fast = true) {
  await page.goto(fast ? '/?fastMode=1' : '/');
  await page.getByLabel('Zwei Menschen an einem Gerät').check();
  await page.locator('#player1Name').fill('Alex');
  await page.locator('#player2Name').fill('Sam');
  await page.getByLabel('Gegenüber').check();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page).toHaveURL(/\/spiel/);
}

test('exactly one pile is active at a time, and it is clickable only when it belongs to a human', async ({ page }) => {
  await startVsComputer(page);

  const piles = page.locator('.game-screen__pile');
  await expect(piles).toHaveCount(2);

  const activePile = page.locator('.game-screen__pile--active');
  await expect(activePile).toHaveCount(1);

  // The active pile is enabled only if it is not the computer's (player2's) pile.
  const isPlayer2Active = await page
    .locator('.game-screen__player', { hasText: 'Computer' })
    .locator('.game-screen__pile--active')
    .count();
  if (isPlayer2Active > 0) {
    await expect(activePile).toBeDisabled();
  } else {
    await expect(activePile).toBeEnabled();
  }
});

test('the computer plays on its own after a short delay, without any click', async ({ page }) => {
  await startVsComputer(page, 'Alex', false);

  const computerPileCount = page.locator('.game-screen__player', { hasText: 'Computer' }).locator('.game-screen__pile-count');
  const humanPileCount = page.locator('.game-screen__player', { hasText: 'Alex' }).locator('.game-screen__pile-count');

  const before = [await computerPileCount.textContent(), await humanPileCount.textContent()];

  // Whether it is the human's or the computer's turn first is random (Date.now() seed).
  // Either way, within a couple of seconds *something* must have changed on its own,
  // or the human pile must be the one waiting for a real click.
  const humanIsActive = await page.locator('.game-screen__pile--active:not([disabled])').count();
  if (humanIsActive === 0) {
    await page.waitForTimeout(1500);
    const after = [await computerPileCount.textContent(), await humanPileCount.textContent()];
    expect(after).not.toEqual(before);
  }
});

test('clicking a pile that is not active does nothing', async ({ page }) => {
  await startVsComputer(page);
  const disabledPile = page.locator('.game-screen__pile[disabled]').first();
  const count = await disabledPile.locator('.game-screen__pile-count').textContent();
  await disabledPile.click({ force: true });
  await page.waitForTimeout(200);
  await expect(disabledPile.locator('.game-screen__pile-count')).toHaveText(count ?? '');
});

test('facing seating rotates the opponent but not the center pile; side-by-side rotates nothing', async ({ page }) => {
  await startTwoHumansFacing(page);

  await expect(page.locator('.game-screen__player--rotated')).toHaveCount(1);
  // The pile stays in the same orientation as the players' own cards - only the
  // opponent's card area (and the winner banner, checked separately) flips.
  await expect(page.locator('.game-screen__center--rotated')).toHaveCount(0);
  await expect(page.locator('.game-screen__board--side-by-side')).toHaveCount(0);
});

test('facing seating: the winner banner is oriented toward the actual winner, not rotated with the pile', async ({ page }) => {
  test.setTimeout(30_000);
  // Real delays needed to actually observe the banner (see the fastMode note above).
  await startTwoHumansFacing(page, false);

  let winnerName: string | null = null;
  // Budget generously: each real move now also pays the play-into-center flight
  // delay (see TestModeService/PLAY_FLIGHT_MS), and a trick can take several moves.
  for (let i = 0; i < 300 && winnerName === null; i++) {
    const active = page.locator('.game-screen__pile--active:not([disabled])');
    if ((await active.count()) > 0) {
      await active.click();
    }
    const banner = page.locator('.game-screen__winner-banner');
    if ((await banner.count()) > 0) {
      winnerName = (await banner.textContent())?.trim().split(' ')[0] ?? null;
      break;
    }
    await page.waitForTimeout(30);
  }
  expect(winnerName).not.toBeNull();

  const banner = page.locator('.game-screen__winner-banner');
  // Sam is player2, whose whole card area is already shown rotated 180deg in
  // facing seating - the banner must match that so Sam can read it upright too.
  if (winnerName === 'Sam') {
    await expect(banner).toHaveClass(/game-screen__winner-banner--flipped/);
  } else {
    await expect(banner).not.toHaveClass(/game-screen__winner-banner--flipped/);
  }

  // The banner's own rotation must be 0 or 180deg (upright or flipped for the
  // winner) - never the pile's 90deg, which would make it sideways/unreadable.
  const rotationDeg = await banner.evaluate((el) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return Math.round(Math.atan2(matrix.b, matrix.a) * (180 / Math.PI));
  });
  expect([0, 180, -180]).toContain(rotationDeg);
});

test('a won trick shows the winning card and the winner\'s name for a few seconds before being collected', async ({ page }) => {
  test.setTimeout(30_000);
  await startVsComputer(page, 'Alex', false);

  // Play moves until a trick is actually won (should happen quickly; roughly 1-in-4 per card).
  let bannerSeen = false;
  for (let i = 0; i < 100 && !bannerSeen; i++) {
    const active = page.locator('.game-screen__pile--active:not([disabled])');
    if ((await active.count()) > 0) {
      await active.click();
    }
    if ((await page.locator('.game-screen__winner-banner').count()) > 0) {
      bannerSeen = true;
      break;
    }
    await page.waitForTimeout(150);
  }
  expect(bannerSeen).toBe(true);

  const bannerText = await page.locator('.game-screen__winner-banner').textContent();
  expect(bannerText).toMatch(/(Alex|Computer) gewinnt den Stich!/);

  // The winning card(s) must actually be shown, not just the banner.
  const cardCount = await page.locator('.game-screen__center-card').count();
  expect(cardCount).toBeGreaterThan(0);

  // Matches the game-screen component's own collect-delay formula: a static
  // visible phase, then each card flying off staggered one after another.
  const expectedTotalMs = 2400 + Math.max(0, cardCount - 1) * 120 + 500;

  // Comfortably before the computed mark: still showing (also satisfies the
  // "at least 3 seconds visible" requirement, since expectedTotalMs >= 3000).
  await page.waitForTimeout(expectedTotalMs - 800);
  await expect(page.locator('.game-screen__winner-banner')).toHaveCount(1);

  // Comfortably after the computed mark: collected and gone.
  await page.waitForTimeout(1600);
  await expect(page.locator('.game-screen__winner-banner')).toHaveCount(0);
});

test('a vsComputer game can be played through many tricks without breaking', async ({ page }) => {
  // fastMode removes the UI delays, so this normally finishes in well under a minute -
  // but real games can still legitimately run very long by chance (the pile-recycling
  // mechanic has no guaranteed upper bound, see CLAUDE.md's note on the simulation
  // needing a length cap), so this still tolerates not finishing within budget.
  test.setTimeout(120_000);
  await startVsComputer(page);

  const deadline = Date.now() + 90_000;
  let finished = false;
  while (Date.now() < deadline) {
    if ((await page.locator('.game-screen__result').count()) > 0) {
      finished = true;
      break;
    }
    const activeEnabled = page.locator('.game-screen__pile--active:not([disabled])');
    if ((await activeEnabled.count()) > 0) {
      await activeEnabled.click();
    }
    await page.waitForTimeout(5);
  }

  if (finished) {
    await expect(page.locator('.game-screen__result-counts')).toContainText('Karten');
    const totalCards = await page.locator('.game-screen__result-counts dd').allTextContents();
    const sum = totalCards.reduce((acc, text) => acc + parseInt(text, 10), 0);
    expect(sum).toBeGreaterThan(0);
    expect(sum).toBeLessThanOrEqual(32);
  } else {
    const pileCounts = await page.locator('.game-screen__pile-count').allTextContents();
    const sum = pileCounts.reduce((acc, text) => acc + parseInt(text, 10), 0);
    expect(sum).toBeGreaterThan(0);
    expect(sum).toBeLessThanOrEqual(32);
  }
});

test('the history panel is hidden by default and lists moves newest-first once shown', async ({ page }) => {
  await startVsComputer(page);

  await expect(page.locator('.game-screen__history')).toHaveCount(0);

  // Play a couple of moves before revealing history, so there is something to check.
  for (let i = 0; i < 3; i++) {
    const active = page.locator('.game-screen__pile--active:not([disabled])');
    if ((await active.count()) > 0) {
      await active.click();
    }
    await page.waitForTimeout(30);
  }

  await page.getByLabel('Spielverlauf anzeigen').check();
  await expect(page.locator('.game-screen__history')).toBeVisible();

  const entries = page.locator('.game-screen__history-entry');
  const count = await entries.count();
  expect(count).toBeGreaterThan(0);

  // reversed <ol> + explicit value per <li> means the *first* rendered entry
  // has the *highest* move number (newest first).
  if (count > 1) {
    const firstValue = await entries.nth(0).getAttribute('value');
    const secondValue = await entries.nth(1).getAttribute('value');
    expect(Number(firstValue)).toBeGreaterThan(Number(secondValue ?? '0'));
  }

  await page.getByLabel('Spielverlauf anzeigen').uncheck();
  await expect(page.locator('.game-screen__history')).toHaveCount(0);
});

test('side-by-side seating uses a row layout with no rotation', async ({ page }) => {
  await startTwoHumansSideBySide(page);

  await expect(page.locator('.game-screen__board--side-by-side')).toHaveCount(1);
  await expect(page.locator('.game-screen__player--rotated')).toHaveCount(0);
});

test('side-by-side seating shows both player names above their pile, not one above and one below', async ({ page }) => {
  await startTwoHumansSideBySide(page);

  const players = page.locator('.game-screen__player');
  await expect(players).toHaveCount(2);

  for (let i = 0; i < 2; i++) {
    const player = players.nth(i);
    const nameBox = await player.locator('.game-screen__player-name').boundingBox();
    const pileBox = await player.locator('.game-screen__pile').boundingBox();
    expect(nameBox).not.toBeNull();
    expect(pileBox).not.toBeNull();
    // "Above" means a smaller y (closer to the top of the viewport).
    expect(nameBox!.y).toBeLessThan(pileBox!.y);
  }
});

test('side-by-side seating flies a won pile toward the actual winner (player2 is on the left, player1 on the right)', async ({ page }) => {
  test.setTimeout(30_000);
  // Real delays needed here: with fastMode the collect delay is 0ms, so the
  // winner banner this test looks for would appear and vanish within a single
  // tick, faster than polling could ever observe it.
  await startTwoHumansSideBySide(page, false);

  let winnerName: string | null = null;
  // Budget generously: each real move now also pays the play-into-center flight
  // delay (see TestModeService/PLAY_FLIGHT_MS), and a trick can take several moves.
  for (let i = 0; i < 300 && winnerName === null; i++) {
    const active = page.locator('.game-screen__pile--active:not([disabled])');
    if ((await active.count()) > 0) {
      await active.click();
    }
    const banner = page.locator('.game-screen__winner-banner');
    if ((await banner.count()) > 0) {
      winnerName = (await banner.textContent())?.trim().split(' ')[0] ?? null;
      break;
    }
    await page.waitForTimeout(30);
  }
  expect(winnerName).not.toBeNull();

  const stack = page.locator('.game-screen__center-stack');
  if (winnerName === 'Sam') {
    // Sam is player2, rendered first in the DOM -> visually on the left.
    await expect(stack).toHaveClass(/game-screen__center-stack--fly-left/);
  } else {
    await expect(stack).toHaveClass(/game-screen__center-stack--fly-right/);
  }
});

test('facing seating flies a won pile toward the actual winner (player2 is on top, player1 at the bottom)', async ({ page }) => {
  test.setTimeout(30_000);
  await startTwoHumansFacing(page, false);

  let winnerName: string | null = null;
  // Budget generously: each real move now also pays the play-into-center flight
  // delay (see TestModeService/PLAY_FLIGHT_MS), and a trick can take several moves.
  for (let i = 0; i < 300 && winnerName === null; i++) {
    const active = page.locator('.game-screen__pile--active:not([disabled])');
    if ((await active.count()) > 0) {
      await active.click();
    }
    const banner = page.locator('.game-screen__winner-banner');
    if ((await banner.count()) > 0) {
      winnerName = (await banner.textContent())?.trim().split(' ')[0] ?? null;
      break;
    }
    await page.waitForTimeout(30);
  }
  expect(winnerName).not.toBeNull();

  const stack = page.locator('.game-screen__center-stack');
  if (winnerName === 'Sam') {
    // Sam is player2, rendered first in the DOM -> visually on top.
    await expect(stack).toHaveClass(/game-screen__center-stack--fly-up/);
  } else {
    await expect(stack).toHaveClass(/game-screen__center-stack--fly-down/);
  }

  // The pile itself must never be rotated relative to the players' own cards -
  // confirmed by checking its computed rotation is 0deg, not the old 90deg.
  const rotationDeg = await page.locator('.game-screen__center').evaluate((el) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return Math.round(Math.atan2(matrix.b, matrix.a) * (180 / Math.PI));
  });
  expect(rotationDeg).toBe(0);
});
