import { describe, expect, test } from 'bun:test';
import { formatWallTimestamp } from '../../src/shared/wallTimestamp.js';

describe('wall post timestamps', () => {
    const now = new Date(2026, 10, 12, 14, 30);

    test('shows only the time for posts from today', () => {
        const result = formatWallTimestamp(new Date(2026, 10, 12, 9, 5).toISOString(), now);
        expect(result).not.toContain('2026');
        expect(result).not.toContain('Yesterday');
        expect(result).toMatch(/9:05|09:05/);
    });

    test('shows Yesterday for posts from the previous local day', () => {
        expect(formatWallTimestamp(new Date(2026, 10, 11, 23, 59).toISOString(), now)).toBe('Yesterday');
    });

    test('shows only a date for older posts and nothing for invalid dates', () => {
        const result = formatWallTimestamp(new Date(2026, 10, 10, 8, 15).toISOString(), now);
        expect(result).toContain('10');
        expect(result).toContain('2026');
        expect(result).not.toContain('8:15');
        expect(formatWallTimestamp('not a date', now)).toBe('');
    });
});