import { describe, expect, it } from 'vitest';
import {
  calculateTimeBonus,
  calculateClearBonus,
  calculateTotalScore,
  calculateRank,
  validateSaveData,
  DEFAULT_SAVE,
} from '../../src/lib/scoring';

describe('Game Scoring, Progression & Save Validation', () => {
  describe('calculateTimeBonus', () => {
    it('calculates 10 points per remaining second', () => {
      expect(calculateTimeBonus(100)).toBe(1000);
      expect(calculateTimeBonus(45.2)).toBe(460);
    });

    it('clamps negative or invalid time safely to 0', () => {
      expect(calculateTimeBonus(-15)).toBe(0);
      expect(calculateTimeBonus(NaN)).toBe(0);
    });
  });

  describe('calculateClearBonus', () => {
    it('calculates 1000 * (levelIdx + 1)', () => {
      expect(calculateClearBonus(0)).toBe(1000); // World 1
      expect(calculateClearBonus(1)).toBe(2000); // World 2
      expect(calculateClearBonus(4)).toBe(5000); // World 5
    });

    it('safely handles negative or NaN indices', () => {
      expect(calculateClearBonus(-5)).toBe(1000);
      expect(calculateClearBonus(NaN)).toBe(1000);
    });
  });

  describe('calculateTotalScore', () => {
    it('combines base score, time bonus, and clear bonus correctly', () => {
      // Base: 2500, time: 50s (500 pts), World 1 (levelIdx 0 -> 1000 pts) = 4000
      const total = calculateTotalScore(2500, 50, 0);
      expect(total).toBe(4000);
    });
  });

  describe('calculateRank', () => {
    it('assigns correct ranks and titles based on score and coins', () => {
      const sRank = calculateRank(15000, 20);
      expect(sRank.rank).toBe('S');
      expect(sRank.title).toBe('Pixel Legend');

      const aRank = calculateRank(8000, 10);
      expect(aRank.rank).toBe('A');
      expect(aRank.title).toBe('Master Adventurer');

      const bRank = calculateRank(3000, 5);
      expect(bRank.rank).toBe('B');
      expect(bRank.title).toBe('Nimble Hero');

      const cRank = calculateRank(500, 0);
      expect(cRank.rank).toBe('C');
      expect(cRank.title).toBe('Brave Scout');
    });
  });

  describe('validateSaveData', () => {
    it('returns default save data when given null, undefined, or corrupt json', () => {
      expect(validateSaveData(null)).toEqual(DEFAULT_SAVE);
      expect(validateSaveData(undefined)).toEqual(DEFAULT_SAVE);
      expect(validateSaveData([])).toEqual(DEFAULT_SAVE);
      expect(validateSaveData('corrupted string')).toEqual(DEFAULT_SAVE);
    });

    it('validates and clamps unlocked level to [1, 5]', () => {
      const valid = validateSaveData({ unlocked: 3, high: 5200 });
      expect(valid.unlocked).toBe(3);
      expect(valid.high).toBe(5200);

      const clampedHigh = validateSaveData({ unlocked: 99 });
      expect(clampedHigh.unlocked).toBe(5);

      const clampedLow = validateSaveData({ unlocked: -10 });
      expect(clampedLow.unlocked).toBe(1);
    });

    it('preserves valid characters and defaults invalid character IDs', () => {
      expect(validateSaveData({ char: 'bramble' }).char).toBe('bramble');
      expect(validateSaveData({ char: 'zip' }).char).toBe('zip');
      expect(validateSaveData({ char: 'hacked_char' }).char).toBe('ember');
    });
  });
});
