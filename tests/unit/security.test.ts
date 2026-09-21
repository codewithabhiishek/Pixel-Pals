import { describe, expect, it } from 'vitest';
import {
  stripTags,
  escapeHtml,
  sanitizeText,
  sanitizeName,
  sanitizeEmail,
  isValidEmail,
  sanitizeObject,
  isSpeedTrapTriggered,
  isHoneypotTriggered,
  isRateLimited,
} from '../../src/lib/security';

describe('Strix Security Controls', () => {
  describe('stripTags & escapeHtml', () => {
    it('strips script and HTML tags safely', () => {
      expect(stripTags('<script>alert("hack")</script>PlayerOne')).toBe('alert("hack")PlayerOne');
      expect(stripTags('<b>Fox</b> Runner')).toBe('Fox Runner');
      expect(stripTags(null)).toBe('');
      expect(stripTags(undefined)).toBe('');
    });

    it('escapes special characters for safe HTML rendering', () => {
      const malicious = '<img src=x onerror=alert(1)> "Fox & Friends"';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<img');
      expect(escaped).toContain('&quot;');
      expect(escaped).toContain('&amp;');
    });
  });

  describe('sanitizeName', () => {
    it('cleans names and bounds length', () => {
      expect(sanitizeName('  Ember   Fox\n')).toBe('Ember   Fox');
      expect(sanitizeName('A'.repeat(100), 10)).toBe('A'.repeat(10));
    });

    it('blocks prototype pollution vectors and reserved keywords', () => {
      expect(sanitizeName('__proto__')).toBe('');
      expect(sanitizeName('constructor')).toBe('');
      expect(sanitizeName('prototype')).toBe('');
      expect(sanitizeName('null')).toBe('');
      expect(sanitizeName('undefined')).toBe('');
    });
  });

  describe('sanitizeEmail & isValidEmail', () => {
    it('cleans email addresses properly', () => {
      expect(sanitizeEmail('  Player@Example.COM  ')).toBe('player@example.com');
      expect(sanitizeEmail('<script>bad</script>test@domain.com')).toBe('badtest@domain.com');
    });

    it('validates standard email formats', () => {
      expect(isValidEmail('gamer@pixelpals.app')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('sanitizeObject (Prototype Pollution Defense)', () => {
    it('removes __proto__, constructor, and prototype from configuration objects', () => {
      const malicious = {
        hero: 'Ember',
        __proto__: { isAdmin: true },
        constructor: { evil: true },
        prototype: { exploit: true },
        notes: '<p>Great game!</p>',
      };

      const clean = sanitizeObject(malicious);
      expect(clean.hero).toBe('Ember');
      expect(clean.notes).toBe('Great game!');
      expect(Object.prototype.hasOwnProperty.call(clean, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(clean, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(clean, 'prototype')).toBe(false);
      expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
    });
  });

  describe('Bot Trap & Cooldown Defenses', () => {
    it('detects honeypot triggers', () => {
      expect(isHoneypotTriggered(false, '')).toBe(false);
      expect(isHoneypotTriggered(true, '')).toBe(true);
      expect(isHoneypotTriggered(false, 'bot-decoy-val')).toBe(true);
    });

    it('detects automated sub-second speed traps', () => {
      const now = Date.now();
      expect(isSpeedTrapTriggered(now - 300, 1800)).toBe(true);
      expect(isSpeedTrapTriggered(now - 2500, 1800)).toBe(false);
    });

    it('enforces rate limits on repeated submissions', () => {
      const key = `test_cooldown_${Date.now()}`;
      expect(isRateLimited(key, 5000)).toBe(false);
      expect(isRateLimited(key, 5000)).toBe(true);
    });
  });
});
