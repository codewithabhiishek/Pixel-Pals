/**
 * Pure Game Scoring, Progression, and Save Validation Engine for Pixel Pals
 */

import { CHARACTERS } from '../game/characters';

export interface SaveData {
  high: number;
  unlocked: number;
  cleared: boolean[];
  sfx: boolean;
  music: boolean;
  char: string;
  scanlines: boolean;
  touchMode: 'auto' | 'on' | 'off';
}

export const DEFAULT_SAVE: SaveData = {
  high: 0,
  unlocked: 1,
  cleared: [false, false, false, false, false],
  sfx: true,
  music: true,
  char: 'ember',
  scanlines: true,
  touchMode: 'auto',
};

/**
 * Calculates time bonus based on remaining seconds
 */
export function calculateTimeBonus(timeLeft: number): number {
  const safeTime = Math.max(0, Number.isFinite(timeLeft) ? timeLeft : 0);
  return Math.ceil(safeTime) * 10;
}

/**
 * Calculates level clearance bonus based on world index
 */
export function calculateClearBonus(levelIdx: number): number {
  const safeIdx = Math.max(0, Number.isFinite(levelIdx) ? Math.floor(levelIdx) : 0);
  return 1000 * (safeIdx + 1);
}

/**
 * Calculates total score adding time bonus and clearance bonus
 */
export function calculateTotalScore(baseScore: number, timeLeft: number, levelIdx: number): number {
  const safeBase = Math.max(0, Number.isFinite(baseScore) ? Math.floor(baseScore) : 0);
  return safeBase + calculateTimeBonus(timeLeft) + calculateClearBonus(levelIdx);
}

/**
 * Computes performance rank based on score and coins collected
 */
export function calculateRank(score: number, coins: number): { rank: 'S' | 'A' | 'B' | 'C'; title: string } {
  const safeScore = Math.max(0, Number.isFinite(score) ? score : 0);
  const safeCoins = Math.max(0, Number.isFinite(coins) ? coins : 0);

  const composite = safeScore + safeCoins * 50;

  if (composite >= 15000) {
    return { rank: 'S', title: 'Pixel Legend' };
  }
  if (composite >= 8000) {
    return { rank: 'A', title: 'Master Adventurer' };
  }
  if (composite >= 3000) {
    return { rank: 'B', title: 'Nimble Hero' };
  }
  return { rank: 'C', title: 'Brave Scout' };
}

/**
 * Validates and sanitizes raw save game state, preventing corrupted values or injection
 */
export function validateSaveData(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_SAVE };
  }

  const p = raw as Record<string, unknown>;

  const high = typeof p.high === 'number' && Number.isFinite(p.high) && p.high >= 0
    ? Math.min(10_000_000, Math.floor(p.high))
    : 0;

  const unlocked = typeof p.unlocked === 'number' && Number.isFinite(p.unlocked)
    ? Math.min(5, Math.max(1, Math.floor(p.unlocked)))
    : 1;

  const cleared = Array.isArray(p.cleared) && p.cleared.length === 5
    ? (p.cleared.map(Boolean) as boolean[])
    : [...DEFAULT_SAVE.cleared];

  const char = typeof p.char === 'string' && CHARACTERS.some((c) => c.id === p.char)
    ? p.char
    : 'ember';

  const touchMode = p.touchMode === 'on' || p.touchMode === 'off' ? p.touchMode : 'auto';

  return {
    high,
    unlocked,
    cleared,
    sfx: p.sfx !== false,
    music: p.music !== false,
    char,
    scanlines: p.scanlines !== false,
    touchMode,
  };
}
