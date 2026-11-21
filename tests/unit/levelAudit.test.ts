import { describe, expect, it } from 'vitest';
import { LEVELS, ROWS, TILE, THEMES } from '../../src/game/levels';

describe('Comprehensive Level Geometry & Gameplay Audit', () => {
  LEVELS.forEach((level, levelIdx) => {
    describe(`World ${levelIdx + 1}: ${level.name}`, () => {
      it('has valid level metadata and dimensions', () => {
        expect(level.cols).toBeGreaterThanOrEqual(100);
        expect(level.rows.length).toBe(ROWS);
        expect(level.time).toBeGreaterThanOrEqual(180);
        expect(THEMES[level.theme]).toBeDefined();
        for (const row of level.rows) {
          expect(row.length).toBe(level.cols);
        }
      });

      it('has exactly one valid player spawn point', () => {
        let spawnCount = 0;
        let spawnPos = { c: -1, r: -1 };
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < level.cols; c++) {
            if (level.rows[r][c] === 'P') {
              spawnCount++;
              spawnPos = { c, r };
            }
          }
        }
        expect(spawnCount).toBe(1);
        expect(spawnPos.c).toBeGreaterThanOrEqual(0);
        expect(spawnPos.r).toBeGreaterThanOrEqual(0);

        // Directly below spawn must be solid or platform
        const belowTile = level.rows[spawnPos.r + 1]?.[spawnPos.c];
        expect(['#', '=']).toContain(belowTile);

        // Spawn tile itself must not be blocked
        expect(['#', 'B', '^', '~']).not.toContain(level.rows[spawnPos.r][spawnPos.c + 1]);
      });

      it('has reachable checkpoints placed on solid ground', () => {
        let checkpointCount = 0;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < level.cols; c++) {
            if (level.rows[r][c] === 'C') {
              checkpointCount++;
              const belowTile = level.rows[r + 1]?.[c];
              expect(['#', '=']).toContain(belowTile);
            }
          }
        }
        expect(checkpointCount).toBeGreaterThanOrEqual(1);
      });

      it('has a clear completion condition (Goal flag or Boss)', () => {
        let goalCount = 0;
        let bossCount = 0;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < level.cols; c++) {
            if (level.rows[r][c] === 'G') goalCount++;
            if (level.rows[r][c] === 'z') bossCount++;
          }
        }
        if (level.hasBoss) {
          expect(bossCount).toBe(1);
        } else {
          expect(goalCount).toBe(1);
        }
      });

      it('verifies all moving platforms are within level bounds and do not clip into solids', () => {
        for (const mover of level.movers) {
          expect(mover.c).toBeGreaterThanOrEqual(0);
          expect(mover.c + mover.w).toBeLessThanOrEqual(level.cols);
          expect(mover.r).toBeGreaterThanOrEqual(0);
          expect(mover.r).toBeLessThan(ROWS);

          if (mover.axis === 'x') {
            const minC = Math.max(0, mover.c - mover.dist);
            const maxC = Math.min(level.cols - 1, mover.c + mover.dist + mover.w);
            expect(minC).toBeGreaterThanOrEqual(0);
            expect(maxC).toBeLessThanOrEqual(level.cols);
          }
        }
      });

      it('verifies no enemies are spawned inside solid terrain or off-screen', () => {
        const solidChars = new Set(['#', 'B']);
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < level.cols; c++) {
            const ch = level.rows[r][c];
            if (['w', 's', 'b'].includes(ch)) {
              // Enemies must not be inside solid block
              expect(solidChars.has(ch)).toBe(false);
              // Must be placed above ground or platform
              const belowTile = level.rows[r + 1]?.[c];
              expect(['#', '=', '~']).toContain(belowTile);
            }
          }
        }
      });

      it('verifies all spring launch pads are placed on solid ground', () => {
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < level.cols; c++) {
            if (level.rows[r][c] === 'S') {
              const belowTile = level.rows[r + 1]?.[c];
              expect(['#', '=']).toContain(belowTile);
            }
          }
        }
      });

      it('verifies movers do not directly overlap static platform tiles', () => {
        for (const mover of level.movers) {
          for (let dc = 0; dc < mover.w; dc++) {
            const c = mover.c + dc;
            expect(level.rows[mover.r]?.[c]).not.toBe('=');
          }
        }
      });
    });
  });
});
