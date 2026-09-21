import { describe, expect, it } from 'vitest';
import { CHARACTERS, getCharacter } from '../../src/game/characters';
import { LEVELS, THEMES } from '../../src/game/levels';

describe('Characters & Levels Configuration', () => {
  describe('Hero Roster', () => {
    it('contains all 4 playable heroes with valid physics stats', () => {
      expect(CHARACTERS.length).toBe(4);

      for (const hero of CHARACTERS) {
        expect(hero.id).toBeTruthy();
        expect(hero.name).toBeTruthy();
        expect(hero.walk).toBeGreaterThan(0);
        expect(hero.run).toBeGreaterThan(hero.walk);
        expect(hero.jump).toBeGreaterThan(0);
        expect(hero.lives).toBeGreaterThanOrEqual(3);
        expect(hero.body).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it('getCharacter retrieves hero by id and falls back gracefully to Ember', () => {
      expect(getCharacter('pip').name).toBe('Pip');
      expect(getCharacter('bramble').name).toBe('Bramble');
      expect(getCharacter('unknown_hero').id).toBe('ember');
    });
  });

  describe('World Levels', () => {
    it('contains all 5 handcrafted worlds with valid theme mappings', () => {
      expect(LEVELS.length).toBe(5);

      for (const level of LEVELS) {
        expect(level.name).toBeTruthy();
        expect(level.cols).toBeGreaterThanOrEqual(100);
        expect(level.time).toBeGreaterThanOrEqual(150);
        expect(level.rows.length).toBe(14);
        expect(THEMES[level.theme]).toBeDefined();
      }
    });

    it('verifies World 5 contains the final boss fight', () => {
      const world5 = LEVELS[4];
      expect(world5.hasBoss).toBe(true);
      expect(world5.rows.some((row) => row.includes('z'))).toBe(true);
    });
  });
});
