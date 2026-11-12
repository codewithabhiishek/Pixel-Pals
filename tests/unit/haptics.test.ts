import { describe, expect, it, afterEach, vi } from 'vitest';
import {
  HAPTIC_PATTERNS,
  isHapticsSupported,
  triggerHaptic,
  haptics,
} from '../../src/lib/hapticsService';

describe('Tactile Mobile Haptics Engine', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('returns false cleanly when navigator is undefined (SSR safety)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(isHapticsSupported()).toBe(false);
    expect(triggerHaptic('tap')).toBe(false);
  });

  it('invokes navigator.vibrate with expected patterns when supported', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    expect(isHapticsSupported()).toBe(true);
    expect(haptics.tap()).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);

    expect(haptics.win()).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.win);

    expect(haptics.hurt()).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.hurt);

    expect(haptics.custom([10, 20])).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith([10, 20]);
  });

  it('handles hardware exceptions gracefully without throwing', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: () => {
          throw new Error('Blocked by browser policy');
        },
      },
      configurable: true,
      writable: true,
    });

    expect(triggerHaptic('select')).toBe(false);
  });
});
