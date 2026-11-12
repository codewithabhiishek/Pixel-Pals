/**
 * Tactile mobile haptic feedback engine for Pixel Pals: Adventure Run.
 * SSR-safe, gracefully degrades when navigator.vibrate is unsupported or denied.
 */

export const HAPTIC_PATTERNS = {
  tap: 8,
  select: 12,
  jump: 8,
  coin: 12,
  stomp: [18, 12, 18],
  hurt: [40, 25, 40],
  powerup: [15, 20, 15, 20],
  oneUp: [15, 20, 15, 20],
  checkpoint: [20, 15, 20],
  bossHit: [30, 20, 30],
  spring: [10, 15],
  win: [25, 20, 25, 20, 40],
  lose: [50, 40, 60],
  error: [35, 50, 35],
  delete: [25, 45, 30],
} as const;

export type HapticType = keyof typeof HAPTIC_PATTERNS;

export function isHapticsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

export function triggerHaptic(type: HapticType | number | number[]): boolean {
  if (!isHapticsSupported()) return false;
  try {
    const pattern = typeof type === 'string' ? HAPTIC_PATTERNS[type as HapticType] : type;
    if (!pattern) return false;
    return navigator.vibrate(pattern as unknown as VibratePattern);
  } catch {
    return false;
  }
}

export const haptics = {
  tap: () => triggerHaptic('tap'),
  select: () => triggerHaptic('select'),
  jump: () => triggerHaptic('jump'),
  coin: () => triggerHaptic('coin'),
  stomp: () => triggerHaptic('stomp'),
  hurt: () => triggerHaptic('hurt'),
  powerup: () => triggerHaptic('powerup'),
  oneUp: () => triggerHaptic('oneUp'),
  checkpoint: () => triggerHaptic('checkpoint'),
  bossHit: () => triggerHaptic('bossHit'),
  spring: () => triggerHaptic('spring'),
  win: () => triggerHaptic('win'),
  lose: () => triggerHaptic('lose'),
  error: () => triggerHaptic('error'),
  delete: () => triggerHaptic('delete'),
  custom: (pattern: number | number[]): boolean => triggerHaptic(pattern),
};
