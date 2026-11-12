/**
 * Multi-User / Multi-Profile Save Data Isolation Service for Pixel Pals: Adventure Run.
 * Ensures each player operates within an isolated save-slot namespace
 * without cross-profile progress collision, high-score overwrites, or accidental data loss.
 */

import { DEFAULT_SAVE, validateSaveData, type SaveData } from './scoring';

export const BASE_SAVE_KEY = 'emberfox_save_v2';
export const LEGACY_SAVE_KEY = 'emberfox_save_v1';
export const ACTIVE_PROFILE_KEY = 'pixel_pals_active_profile';
export const DEFAULT_PROFILE_ID = 'player-1';

export const PRESET_PROFILES = ['player-1', 'player-2', 'guest'] as const;

export function sanitizeProfileId(id?: string | null): string {
  if (!id) return DEFAULT_PROFILE_ID;
  const cleaned = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || DEFAULT_PROFILE_ID;
}

export function getActiveProfileId(): string {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_PROFILE_ID;
    return sanitizeProfileId(localStorage.getItem(ACTIVE_PROFILE_KEY) || DEFAULT_PROFILE_ID);
  } catch {
    return DEFAULT_PROFILE_ID;
  }
}

export function setActiveProfileId(profileId: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_PROFILE_KEY, sanitizeProfileId(profileId));
    }
  } catch {
    /* ignore storage quota/security errors */
  }
}

export function getScopedSaveKey(profileId?: string): string {
  const safeId = sanitizeProfileId(profileId || getActiveProfileId());
  return `${BASE_SAVE_KEY}:${safeId}`;
}

export function migrateLegacySaveIfNeeded(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const defaultScopedKey = `${BASE_SAVE_KEY}:${DEFAULT_PROFILE_ID}`;
    if (localStorage.getItem(defaultScopedKey)) return;

    const legacyV2 = localStorage.getItem(BASE_SAVE_KEY);
    const legacyV1 = localStorage.getItem(LEGACY_SAVE_KEY);
    const legacyRaw = legacyV2 ?? legacyV1;
    if (legacyRaw) {
      const validated = validateSaveData(JSON.parse(legacyRaw));
      localStorage.setItem(defaultScopedKey, JSON.stringify(validated));
    }
  } catch {
    /* ignore corrupted legacy payload */
  }
}

export function loadProfileSave(profileId?: string): SaveData {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SAVE };
    migrateLegacySaveIfNeeded();
    const targetId = sanitizeProfileId(profileId || getActiveProfileId());
    const raw = localStorage.getItem(getScopedSaveKey(targetId));
    if (!raw) return { ...DEFAULT_SAVE };
    return validateSaveData(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function saveProfileData(data: SaveData, profileId?: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const targetId = sanitizeProfileId(profileId || getActiveProfileId());
    const validated = validateSaveData(data);
    const serialized = JSON.stringify(validated);
    localStorage.setItem(getScopedSaveKey(targetId), serialized);
    if (targetId === DEFAULT_PROFILE_ID) {
      localStorage.setItem(BASE_SAVE_KEY, serialized);
    }
  } catch {
    /* storage unavailable */
  }
}

export function getAvailableProfiles(): string[] {
  const profiles = new Set<string>(PRESET_PROFILES);
  try {
    if (typeof localStorage !== 'undefined') {
      const prefix = `${BASE_SAVE_KEY}:`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const id = key.slice(prefix.length);
          if (id) profiles.add(id);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return Array.from(profiles);
}

export function getProfileSummary(profileId: string): { high: number; clearedCount: number; char: string } {
  const data = loadProfileSave(profileId);
  return {
    high: data.high,
    clearedCount: data.cleared.filter(Boolean).length,
    char: data.char,
  };
}

export function deleteProfileData(profileId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const safeId = sanitizeProfileId(profileId);
    if (safeId === DEFAULT_PROFILE_ID) return; // Protect default player-1 slot
    localStorage.removeItem(getScopedSaveKey(safeId));
    if (getActiveProfileId() === safeId) {
      setActiveProfileId(DEFAULT_PROFILE_ID);
    }
  } catch {
    /* ignore */
  }
}
