import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  BASE_SAVE_KEY,
  LEGACY_SAVE_KEY,
  DEFAULT_PROFILE_ID,
  sanitizeProfileId,
  getActiveProfileId,
  setActiveProfileId,
  getScopedSaveKey,
  migrateLegacySaveIfNeeded,
  loadProfileSave,
  saveProfileData,
  getAvailableProfiles,
  getProfileSummary,
  deleteProfileData,
} from '../../src/lib/storageService';
import { DEFAULT_SAVE } from '../../src/lib/scoring';

class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
  get length() { return this.store.size; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
}

describe('Multi-Profile Save Data Isolation', () => {
  const originalStorage = globalThis.localStorage;
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalStorage,
      configurable: true,
      writable: true,
    });
  });

  it('sanitizes profile IDs safely and defaults invalid inputs', () => {
    expect(sanitizeProfileId()).toBe(DEFAULT_PROFILE_ID);
    expect(sanitizeProfileId(null)).toBe(DEFAULT_PROFILE_ID);
    expect(sanitizeProfileId('   ')).toBe(DEFAULT_PROFILE_ID);
    expect(sanitizeProfileId('Player 2!')).toBe('player-2');
    expect(sanitizeProfileId('Alex_99')).toBe('alex_99');
  });

  it('generates scoped storage keys per player profile', () => {
    expect(getScopedSaveKey('player-1')).toBe(`${BASE_SAVE_KEY}:player-1`);
    expect(getScopedSaveKey('player-2')).toBe(`${BASE_SAVE_KEY}:player-2`);
  });

  it('isolates high scores, unlocked worlds, and character choices across profiles', () => {
    saveProfileData({ ...DEFAULT_SAVE, high: 9500, unlocked: 4, char: 'bramble' }, 'player-1');
    saveProfileData({ ...DEFAULT_SAVE, high: 1200, unlocked: 1, char: 'zip' }, 'player-2');

    const p1 = loadProfileSave('player-1');
    const p2 = loadProfileSave('player-2');

    expect(p1.high).toBe(9500);
    expect(p1.unlocked).toBe(4);
    expect(p1.char).toBe('bramble');

    expect(p2.high).toBe(1200);
    expect(p2.unlocked).toBe(1);
    expect(p2.char).toBe('zip');
  });

  it('losslessly migrates legacy v1/v2 save data into player-1 scoped slot', () => {
    const legacySave = { ...DEFAULT_SAVE, high: 4200, unlocked: 3, cleared: [true, true, false, false, false] };
    mockStorage.setItem(LEGACY_SAVE_KEY, JSON.stringify(legacySave));

    migrateLegacySaveIfNeeded();

    const loaded = loadProfileSave(DEFAULT_PROFILE_ID);
    expect(loaded.high).toBe(4200);
    expect(loaded.unlocked).toBe(3);
    expect(loaded.cleared).toEqual([true, true, false, false, false]);
  });

  it('protects default player-1 slot from deletion while allowing custom/guest slot deletion', () => {
    saveProfileData({ ...DEFAULT_SAVE, high: 5000 }, 'player-1');
    saveProfileData({ ...DEFAULT_SAVE, high: 300 }, 'alex');
    setActiveProfileId('alex');

    deleteProfileData('player-1');
    expect(loadProfileSave('player-1').high).toBe(5000);

    deleteProfileData('alex');
    expect(mockStorage.getItem(getScopedSaveKey('alex'))).toBeNull();
    expect(getActiveProfileId()).toBe(DEFAULT_PROFILE_ID);
  });

  it('discovers available profiles and summarizes progress accurately', () => {
    saveProfileData({
      ...DEFAULT_SAVE,
      high: 7777,
      cleared: [true, true, true, false, false],
      char: 'pip',
    }, 'speedrunner');

    const profiles = getAvailableProfiles();
    expect(profiles).toContain('player-1');
    expect(profiles).toContain('speedrunner');

    const summary = getProfileSummary('speedrunner');
    expect(summary.high).toBe(7777);
    expect(summary.clearedCount).toBe(3);
    expect(summary.char).toBe('pip');
  });
});
