/**
 * Condition badge abbreviations.
 *
 * The map used to draw a condition's first letter, which cannot separate
 * Paralyzed, Poisoned, Petrified and Prone — nor Incapacitated from Invisible.
 * The whole point of the table is that no two conditions share a code, so that
 * is what these assert; a collision would silently restore the original bug.
 */

import { describe, it, expect } from 'vitest';
import {
  CONDITION_ABBREVIATIONS,
  MAX_CONDITION_BADGES,
  conditionAbbreviation,
} from '../conditions';

describe('condition abbreviations', () => {
  it('gives every condition a distinct code', () => {
    const codes = Object.values(CONDITION_ABBREVIATIONS);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('separates the conditions a single initial could not', () => {
    // The five that collided on "P" and "I" in the original.
    const collided = ['Paralyzed', 'Poisoned', 'Petrified', 'Prone', 'Incapacitated', 'Invisible'];
    const codes = collided.map(conditionAbbreviation);
    expect(new Set(codes).size).toBe(collided.length);
  });

  it('covers the conditions the token editor offers', () => {
    // Mirrors COMMON_CONDITIONS in NpcQuickEditor.
    const offered = [
      'Blinded', 'Charmed', 'Exhausted', 'Frightened', 'Incapacitated', 'Invisible',
      'Paralyzed', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
    ];
    for (const condition of offered) {
      expect(CONDITION_ABBREVIATIONS[condition.toLowerCase()]).toBeDefined();
    }
  });

  it('covers the conditions the D&D 5e sheet offers', () => {
    const offered = [
      'Blinded', 'Charmed', 'Deafened', 'Exhausted', 'Frightened', 'Grappled',
      'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
      'Prone', 'Restrained', 'Stunned', 'Unconscious',
    ];
    for (const condition of offered) {
      expect(CONDITION_ABBREVIATIONS[condition.toLowerCase()]).toBeDefined();
    }
  });

  it('is case- and whitespace-insensitive', () => {
    expect(conditionAbbreviation('poisoned')).toBe('PO');
    expect(conditionAbbreviation('POISONED')).toBe('PO');
    expect(conditionAbbreviation('  Poisoned ')).toBe('PO');
  });

  it('falls back to two letters for a homebrew condition', () => {
    expect(conditionAbbreviation('Cursed')).toBe('CU');
    expect(conditionAbbreviation('slowed')).toBe('SL');
  });

  it('does not throw on empty input', () => {
    expect(conditionAbbreviation('')).toBe('?');
  });

  it('always returns at most two characters', () => {
    const samples = [...Object.keys(CONDITION_ABBREVIATIONS), 'Cursed', 'X', 'Something Long'];
    for (const s of samples) {
      expect(conditionAbbreviation(s).length).toBeLessThanOrEqual(2);
    }
  });

  it('keeps the badge row short enough to sit above a token', () => {
    expect(MAX_CONDITION_BADGES).toBeGreaterThan(0);
    expect(MAX_CONDITION_BADGES).toBeLessThanOrEqual(5);
  });
});
