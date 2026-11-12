import { test, expect } from 'bun:test';
import { SqliteStore } from '../../src/server/storage/sqlite.js';
import { WallStore } from '../../src/server/storage/wall.js';
import { WALL_LAYOUT_FIELDS } from '../../src/shared/wallDisplay.js';
import { wallTextDisplay, validateWallTextDisplay } from '../../src/shared/wallTextDisplay.js';

test('article previews default to 100 except pinned organizers; explicit choices override defaults', () => {
    expect(wallTextDisplay({ platform: 'x', pinned: true })).toEqual({ enabled: true, limit: 100 });
    expect(wallTextDisplay({ platform: 'instagram' })).toEqual({ enabled: true, limit: 100 });
    expect(wallTextDisplay({ platform: 'manual' })).toEqual({ enabled: true, limit: 100 });
    expect(wallTextDisplay({ platform: 'manual', pinned: true })).toEqual({ enabled: false, limit: 100 });
    expect(wallTextDisplay({ platform: 'manual', pinned: true, textDisplay: { enabled: true, limit: 250 } })).toEqual({ enabled: true, limit: 250 });
    expect(wallTextDisplay({ textDisplay: { enabled: false, limit: 50 } })).toEqual({ enabled: false, limit: 50 });
    for (const value of [null, { enabled: 1, limit: 100 }, { enabled: true, limit: 0 }, { enabled: true, limit: 5001 }, { enabled: true, limit: 1.5 }]) expect(() => validateWallTextDisplay(value)).toThrow();
});

test('social and student posts retain framing, media and approval through edits; invalid framing rolls back', async () => {
    const store = new SqliteStore(':memory:');
    try {
        const name = 'Photo framing', id = await store.createEvent(name, 'password123'), session = store.createSession(id), wall = new WallStore(store);
        wall.updateSettings(session, name, { enabled: true }, 0);
        for (const platform of ['manual', 'x', 'instagram']) {
            const post = wall.submit(name, { text: 'Original', authorName: 'Student', imageUrl: 'https://example.com/photo.jpg' });
            store.db.query('UPDATE wall_posts SET platform=? WHERE event_id=? AND id=?').run(platform, id, post.id);
            const framing = { ratio: '3/4', focusX: 25, focusY: 80 };
            const edit = { action: 'edit', postId: post.id, revision: 0, text: 'Edited caption', authorName: 'Student', mediaLayout: framing, textDisplay: { enabled: false, limit: 250 } };
            wall.action(session, name, edit);
            let saved = wall.moderationFeed(session, name).posts.find(p => p.id === post.id);
            expect(saved).toMatchObject({ platform, text: 'Edited caption', imageUrl: post.imageUrl, mediaLayout: framing, status: 'pending', revision: 1 });
            expect(() => wall.action(session, name, { ...edit, revision: 1, mediaLayout: { ...framing, focusY: 101 } })).toThrow('Invalid photo framing');
            expect(() => wall.action(session, name, edit)).toThrow('changed');
            wall.action(session, name, { action: 'approve', postId: post.id, revision: 1 });
            saved = new WallStore(store).publicFeed(name).posts.find(p => p.id === post.id);
            expect(saved.mediaLayout).toEqual(framing);
            expect(saved.textDisplay).toEqual({ enabled: false, limit: 250 });
            expect(saved.text).toBe('Edited caption');
        }
    } finally { store.close(); }
});

test('panel layout is public, durable, bounded, owner-scoped and revision checked', async () => {
    const store = new SqliteStore(':memory:');
    try {
        const name = 'Layout test', id = await store.createEvent(name, 'password123');
        const session = store.createSession(id), wall = new WallStore(store), before = wall.config(id);
        const patch = { panelColumns: 2, panelGap: 0, panelPadding: 8, panelRadius: 0, panelTextSize: 20 };
        const save = (settings, revision = before.revision, token = session) => wall.action(token, name, { action: 'setLayout', settings, revision });
        const saved = save(patch);
        expect(new WallStore(store).publicFeed(name).wall).toMatchObject(patch);
        expect(saved.xEnabled).toBe(before.xEnabled);
        expect(saved.instagramEnabled).toBe(before.instagramEnabled);
        expect(() => save(patch)).toThrow('Reload');
        expect(() => save(patch, saved.revision, 'invalid')).toThrow();
        expect(() => save({ xEnabled: true }, saved.revision)).toThrow('Invalid panel layout');
        for (const field of WALL_LAYOUT_FIELDS) for (const value of [field.min - 1, field.max + 1, 1.5, '2', null]) {
            expect(() => save({ [field.key]: value }, saved.revision)).toThrow('Invalid');
        }
        expect(wall.publicFeed(name).wall).toMatchObject(patch);
    } finally { store.close(); }
});
