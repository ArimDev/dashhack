import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { readWallNodeBody } from '../../src/server/services/wall-body.js';
import { normalizeWallMedia } from '../../src/server/services/wall-image.js';
import { WallUploadGate } from '../../src/server/services/wall-upload-gate.js';
import { MiB, VOLUME_RESERVE } from '../../src/shared/wallUploads.js';
import { SqliteStore } from '../../src/server/storage/sqlite.js';
import { WallStore } from '../../src/server/storage/wall.js';

describe('Untrusted wall uploads', () => {
    test('large raw phone photo becomes bounded, oriented WebP without metadata', async () => {
        const source = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#3081e0' } }).withMetadata({ orientation: 6 }).png().toBuffer();
        // A large source file with extra bytes must never be kept verbatim.
        const output = await normalizeWallMedia({ mime: 'image/png', data: source });
        const meta = await sharp(output.data).metadata();
        expect(output.mime).toBe('image/webp'); expect(meta.format).toBe('webp');
        expect(meta.height).toBe(1920); expect(meta.width).toBe(1280);
        expect(output.data.length).toBeLessThanOrEqual(MiB);
        expect(meta.exif).toBeUndefined(); expect(meta.orientation).toBeUndefined(); expect(meta.icc).toBeUndefined();
    });
    test('fake, truncated, oversized and excessive-pixel images fail without producing media', async () => {
        await expect(normalizeWallMedia({ mime: 'image/webp', data: Buffer.from('RIFF0000WEBPfake') })).rejects.toMatchObject({ status: 415 });
        const huge = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: 'red' } }).png().toBuffer();
        await expect(normalizeWallMedia({ mime: 'image/png', data: huge })).rejects.toMatchObject({ status: 415 });
        await expect(normalizeWallMedia({ mime: 'image/png', data: Buffer.alloc(2 * MiB + 1) })).rejects.toMatchObject({ status: 413 });
        await expect(normalizeWallMedia({ mime: 'video/mp4', data: Buffer.from('0000ftypisom0000') })).rejects.toMatchObject({ status: 415 });
        await expect(normalizeWallMedia({ mime: 'image/svg+xml', data: Buffer.from('<svg/>') })).rejects.toMatchObject({ status: 415 });
    });
    test('admission caps concurrent processing, client rate, shared-network rate and global rate with bounded state', () => {
        let now = 0; const gate = new WallUploadGate({ now: () => now });
        const release = gate.enter('one', 'wifi');
        expect(() => gate.enter('two', 'wifi')).toThrow('Another upload');
        release(); release();
        for (let i = 0; i < 4; i++) gate.enter('one', 'wifi')();
        expect(() => gate.enter('one', 'wifi')).toThrow('Too many');
        now = 60001;
        for (let i = 0; i < 60; i++) gate.enter(`student-${i}`, 'wifi')();
        expect(() => gate.enter('rotated-cookie', 'wifi')).toThrow('Too many');
        now += 60001;
        for (let i = 0; i < 90; i++) gate.enter(`client-${i}`, `network-${i}`)();
        expect(() => gate.enter('other', 'other')).toThrow('Too many');
        expect(gate.buckets.size).toBeLessThanOrEqual(1024);
        now += 60001; gate.enter('new', 'new')(); expect(gate.buckets.size).toBe(3);
    });
    test('free-space reserve pauses both media and text submissions atomically; moderators can still delete', async () => {
        const store = new SqliteStore(':memory:');
        try {
            const id = await store.createEvent('Capacity', 'password123'), session = store.createSession(id);
            let free = 100 * MiB;
            const wall = new WallStore(store, { freeBytes: () => free });
            wall.updateSettings(session, 'Capacity', { enabled: true }, 0);
            const post = wall.submit('Capacity', { text: 'Keep this' });
            free = VOLUME_RESERVE - 1;
            expect(() => wall.submit('Capacity', { text: 'No room' })).toThrow('paused');
            expect(wall.moderationFeed(session, 'Capacity').posts).toHaveLength(1);
            expect(wall.storageUsage(id).reserveBytes).toBe(VOLUME_RESERVE);
            wall.action(session, 'Capacity', { action: 'reject', postId: post.id, revision: 0 });
            wall.action(session, 'Capacity', { action: 'delete', postId: post.id, revision: 1 });
            expect(wall.moderationFeed(session, 'Capacity').posts).toHaveLength(0);
        } finally { store.close(); }
    });
    test('shared quota includes pending/rejected attachments across events and deletion releases capacity', async () => {
        const store = new SqliteStore(':memory:');
        try {
            const wall = new WallStore(store);
            const data = Buffer.alloc(2 * MiB); Buffer.from('RIFF0000WEBP').copy(data);
            const contexts = [];
            for (const name of ['First', 'Second']) {
                const id = await store.createEvent(name, 'password123'), session = store.createSession(id);
                wall.updateSettings(session, name, { enabled: true }, 0); contexts.push({ name, id, session });
            }
            const first = wall.submit('First', { text: 'Pending' }, { mime: 'image/webp', data });
            for (let i = 0; i < 7; i++) wall.submit('First', {}, { mime: 'image/webp', data });
            for (let i = 0; i < 8; i++) wall.submit('Second', {}, { mime: 'image/webp', data });
            expect(() => wall.submit('First', {}, { mime: 'image/webp', data })).toThrow('storage is full');
            expect(store.db.query('SELECT COUNT(*) AS n FROM wall_posts').get().n).toBe(16);
            wall.action(contexts[0].session, 'First', { action: 'reject', postId: first.id, revision: 0 });
            expect(wall.storageUsage(contexts[0].id).totalBytes).toBe(32 * MiB);
            wall.action(contexts[0].session, 'First', { action: 'delete', postId: first.id, revision: 1 });
            expect(wall.storageUsage(contexts[0].id).totalBytes).toBe(30 * MiB);
            wall.submit('First', {}, { mime: 'image/webp', data });
        } finally { store.close(); }
    });
});


describe('Streaming upload bodies before parsing', () => {
    test('reads split chunks within the cap', async () => {
        const request = new PassThrough(), response = new EventEmitter();
        const body = readWallNodeBody(request, response, { limit: 8 });
        request.write(Buffer.from('abc')); request.end(Buffer.from('def'));
        expect((await body).toString()).toBe('abcdef');
    });
    test('rejects chunked overflow without buffering the remaining body and closes after the error flushes', async () => {
        const request = new PassThrough(), response = new EventEmitter();
        const body = readWallNodeBody(request, response, { limit: 4 });
        request.write(Buffer.from('abc')); request.write(Buffer.from('def'));
        await expect(body).rejects.toMatchObject({ status: 413 });
        expect(request.isPaused()).toBe(true); expect(request.destroyed).toBe(false);
        response.emit('finish');
        await new Promise(resolve => request.once('close', resolve));
        expect(request.destroyed).toBe(true);
    });
    test('a stalled body times out and an interrupted body rejects', async () => {
        const request = new PassThrough(), response = new EventEmitter();
        const body = readWallNodeBody(request, response, { limit: 8, timeoutMs: 10 });
        request.write(Buffer.from('{'));
        await expect(body).rejects.toMatchObject({ status: 408 });
        response.emit('finish');
        const interrupted = new PassThrough();
        const partial = readWallNodeBody(interrupted, response, { limit: 8 });
        interrupted.emit('aborted');
        await expect(partial).rejects.toMatchObject({ status: 400 });
        response.emit('finish');
    });
});
