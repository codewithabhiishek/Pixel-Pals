/**
 * Strix Defensive Security Controls for Pixel Pals: Adventure Run
 */

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Strips all HTML, XML, and script tags from untrusted text
 */
export function stripTags(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = typeof input === 'string' ? input : String(input);
  return str.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Escapes characters for safe insertion into HTML strings
 */
export function escapeHtml(unsafe: unknown): string {
  const str = stripTags(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes plain text input with length boundary enforcement
 */
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (input === null || input === undefined) return '';
  return stripTags(input).slice(0, maxLength);
}

/**
 * Sanitizes user name and defends against prototype pollution vectors
 */
export function sanitizeName(input: unknown, maxLength = 60): string {
  const clean = sanitizeText(input, maxLength).replace(/[\r\n\t]/g, ' ').trim();
  const lower = clean.toLowerCase();
  if (DANGEROUS_KEYS.has(lower) || lower === 'null' || lower === 'undefined') {
    return '';
  }
  return clean;
}

/**
 * Sanitizes email address, stripping whitespace and control characters
 */
export function sanitizeEmail(email: unknown, maxLength = 80): string {
  if (typeof email !== 'string') return '';
  return stripTags(email).replace(/[\r\n\t]/g, '').toLowerCase().trim().slice(0, maxLength);
}

/**
 * Validates email format strictly
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Recursively removes dangerous prototype pollution keys and sanitizes values
 */
export function sanitizeObject<T>(data: T, maxDepth = 6): T {
  if (maxDepth <= 0 || data === null || typeof data !== 'object') {
    return typeof data === 'string' ? (stripTags(data) as unknown as T) : data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item, maxDepth - 1)) as unknown as T;
  }

  const clean = Object.create(null);
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) {
      continue;
    }
    const cleanKey = stripTags(key).slice(0, 64);
    if (!cleanKey) continue;
    clean[cleanKey] = sanitizeObject(value, maxDepth - 1);
  }
  return clean as T;
}

/**
 * Speed-trap defense: Identifies automated bot submissions completing faster than humanly possible
 */
export function isSpeedTrapTriggered(mountTimeMs: number, minThresholdMs = 1800): boolean {
  if (typeof mountTimeMs !== 'number' || !Number.isFinite(mountTimeMs)) {
    return true;
  }
  return Date.now() - mountTimeMs < minThresholdMs;
}

/**
 * Dual Honeypot check: Detects bot submissions populating decoy fields
 */
export function isHoneypotTriggered(botcheck: unknown, gotcha: unknown): boolean {
  if (botcheck === true || botcheck === 'true' || botcheck === '1' || botcheck === 'on') {
    return true;
  }
  if (typeof gotcha === 'string' && gotcha.trim().length > 0) {
    return true;
  }
  return false;
}

const memoryRateLimits = new Map<string, number>();

/**
 * Enforces submission cooldown timer to prevent spamming
 */
export function isRateLimited(key = 'pixel_pals_feedback_cooldown', cooldownMs = 60000): boolean {
  const now = Date.now();
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const last = Number(raw);
        if (Number.isFinite(last) && now - last < cooldownMs) {
          return true;
        }
      }
      localStorage.setItem(key, String(now));
      return false;
    } catch {
      // fallback to memory
    }
  }

  const last = memoryRateLimits.get(key);
  if (last && now - last < cooldownMs) {
    return true;
  }
  memoryRateLimits.set(key, now);
  return false;
}
