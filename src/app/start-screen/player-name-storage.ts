const STORAGE_KEY = 'farbenklatsch.playerNames';

export interface StoredPlayerNames {
  player1Name: string;
  player2Name: string;
}

const EMPTY: StoredPlayerNames = { player1Name: '', player2Name: '' };

/** Reads previously saved player names, tolerating missing/corrupt/unavailable storage. */
export function loadStoredPlayerNames(): StoredPlayerNames {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return EMPTY;
    }
    const { player1Name, player2Name } = parsed as Record<string, unknown>;
    return {
      player1Name: typeof player1Name === 'string' ? player1Name : '',
      player2Name: typeof player2Name === 'string' ? player2Name : '',
    };
  } catch {
    return EMPTY;
  }
}

export function storePlayerNames(names: StoredPlayerNames): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // Storage may be unavailable (private browsing, quota) - not critical, ignore.
  }
}
