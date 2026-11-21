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
    it('contains all 7 handcrafted worlds with valid theme mappings', () => {
      expect(LEVELS.length).toBe(7);

      for (const level of LEVELS) {
        expect(level.name).toBeTruthy();
        expect(level.cols).toBeGreaterThanOrEqual(100);
        expect(level.time).toBeGreaterThanOrEqual(150);
        expect(level.rows.length).toBe(14);
        expect(THEMES[level.theme]).toBeDefined();
      }
    });

    it('verifies escalating difficulty curve with strictly increasing level speeds', () => {
      for (let i = 1; i < LEVELS.length; i++) {
        expect(LEVELS[i].speed).toBeGreaterThan(LEVELS[i - 1].speed);
      }
      expect(LEVELS[0].speed).toBe(0.88);
      expect(LEVELS[6].speed).toBe(1.58);
    });

    it('verifies unique per-world mechanics and distinct obstacle layouts', () => {
      // World 1: Meadow beginner plains
      expect(LEVELS[0].theme).toBe('meadow');
      expect(THEMES[LEVELS[0].theme].icy).toBe(false);

      // World 2: Crystal Hollow with ceiling stalactites
      const world2 = LEVELS[1];
      expect(world2.theme).toBe('cave');
      expect(world2.rows.some((row) => row.includes('V'))).toBe(true);

      // World 3: Ember Dunes with spring launch pads
      const world3 = LEVELS[2];
      expect(world3.theme).toBe('dunes');
      expect(world3.rows.some((row) => row.includes('S'))).toBe(true);

      // World 4: Frostbite Peaks with icy slide physics
      const world4 = LEVELS[3];
      expect(THEMES[world4.theme].icy).toBe(true);

      // World 5: Magmor's Forge with volcanic fireball eruptions and boss fight
      const world5 = LEVELS[4];
      expect(world5.hasBoss).toBe(true);
      expect(THEMES[world5.theme].hasEruptions).toBe(true);
      expect(world5.rows.some((row) => row.includes('z'))).toBe(true);

      // World 6: Aether Skyway with wind updrafts and spring clouds
      const world6 = LEVELS[5];
      expect(world6.name).toBe('Aether Skyway');
      expect(THEMES[world6.theme].windUpdraft).toBe(true);
      expect(world6.rows.some((row) => row.includes('S'))).toBe(true);

      // World 7: Starfall Void with cosmic zero-G, spring pads, and 6 orbital movers
      const world7 = LEVELS[6];
      expect(world7.name).toBe('Starfall Void');
      expect(THEMES[world7.theme].lowGravity).toBe(true);
      expect(world7.rows.some((row) => row.includes('S'))).toBe(true);
      expect(world7.movers.length).toBe(6);
    });

    it('verifies all 7 worlds have distinct names and themes', () => {
      const names = new Set(LEVELS.map((l) => l.name));
      const themes = new Set(LEVELS.map((l) => l.theme));
      expect(names.size).toBe(7);
      expect(themes.size).toBe(7);
    });
  });
});
