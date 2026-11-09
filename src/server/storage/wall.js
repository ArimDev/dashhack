import { randomUUID } from 'node:crypto';
import { StorageError } from './sqlite.js';
import { statfsSync } from 'node:fs';
import { dirname } from 'node:path';
import { MAX_UPLOAD_BYTES, WALL_MEDIA_BUDGET, EVENT_MEDIA_BUDGET, VOLUME_RESERVE, MAX_DATABASE_BYTES } from '../../shared/wallUploads.js';

export { MAX_UPLOAD_BYTES } from '../../shared/wallUploads.js';
export const WALL_DEFAULTS = Object.freeze({ title: '', enabled: false, publicUploadEnabled: true, moderationMode: 'manual',
    windowMinutes: 1440, idleCycleSeconds: 25, idleWaitSeconds: 5, scrollSpeed: 40, queryHashtags: [],
    xEnabled: false, xPollIntervalMinutes: 5, xQueryHashtags: [], xQueryHandles: [],
    instagramEnabled: false, instagramPollIntervalMinutes: 5, instagramQueryHashtags: [],
    blacklistedKeywords: [], blacklistedAuthors: [] });
const PUBLIC_KEYS = ['title', 'enabled', 'publicUploadEnabled', 'windowMinutes', 'idleCycleSeconds', 'idleWaitSeconds', 'scrollSpeed', 'revision'];
function fail(message, status = 400) { throw new StorageError(status, message); }
function string(value = '', max = 1000) {
    if (typeof value !== 'string' || value.length > max) fail('Invalid wall text');
    return value.trim();
}
function url(value = '') {
    if (!value) return '';
    let parsed; try { parsed = new URL(string(value, 2000)); } catch { fail('Invalid media/source URL'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) fail('Use HTTPS media/source URLs');
    return parsed.href;
}
function list(value, kind) {
    if (!Array.isArray(value) || value.length > 30) fail('Use at most 30 filter/query terms');
    return [...new Set(value.map(term => {
        term = string(term, 80);
        if (kind === 'hashtag') {
            term = term.replace(/^#/, '');
            if (!/^[\p{L}\p{N}_]+$/u.test(term)) fail('Invalid hashtag');
            term = `#${term}`;
        } else if (kind === 'handle') {
            term = term.replace(/^@/, '');
            if (!/^[a-z\d_]{1,15}$/i.test(term)) fail('Invalid X handle');
            term = `@${term}`;
        }
        if (!term) fail('Empty filter term');
        return term;
    }))];
}
function validateSettings(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) fail('Invalid wall settings');
    const next = {};
    for (const [key, value] of Object.entries(patch)) {
        if (!Object.hasOwn(WALL_DEFAULTS,key)) fail('Unknown wall setting');
        if (key === 'title') next[key] = string(value, 120);
        else if (['enabled', 'publicUploadEnabled', 'xEnabled', 'instagramEnabled'].includes(key)) {
            if (typeof value !== 'boolean') fail('Invalid wall switch');
            next[key] = value;
        } else if (key === 'moderationMode') {
            if (!['auto', 'manual'].includes(value)) fail('Invalid moderation mode');
            next[key] = value;
        } else if (Array.isArray(WALL_DEFAULTS[key])) {
            next[key] = list(value, key.toLowerCase().includes('hashtag') ? 'hashtag' : key === 'xQueryHandles' ? 'handle' : 'filter');
            if (key === 'instagramQueryHashtags' && next[key].some(term => [...term.slice(1)].length < 2)) fail('Instagram hashtags need at least 2 characters');
        } else {
            const [min, max] = key === 'scrollSpeed' ? [10, 100] : key === 'windowMinutes' ? [15, 10080] : ['xPollIntervalMinutes', 'instagramPollIntervalMinutes'].includes(key) ? [1, 180] : [5, 600];
            if (!Number.isInteger(value) || value < min || value > max) fail(`Invalid ${key} (${min}–${max})`);
            next[key] = value;
        }
    }
    return next;
}
export function filtersAllow(post, wall) {
    const author = `${post.authorName} ${post.handle}`.toLowerCase();
    const combined = `${post.text} ${author}`.toLowerCase();
    return !wall.blacklistedAuthors.some(term => author.includes(term.toLowerCase())) &&
        !wall.blacklistedKeywords.some(term => combined.includes(term.toLowerCase()));
}
export function validateMedia(data, mime) {
    if (!data?.length || data.length > MAX_UPLOAD_BYTES) fail('Prepared photos must be at most 2 MiB. Use the upload page to resize your photo.', 413);
    const head = Buffer.from(data.subarray(0, 32));
    const valid = {
        'image/jpeg': head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
        'image/png': head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
        'image/gif': /^GIF8[79]a/.test(head.toString()),
        'image/webp': head.toString('ascii',0,4) === 'RIFF' && head.toString('ascii',8,12) === 'WEBP',
        'image/avif': head.toString('ascii',4,8) === 'ftyp' && /avif|avis/.test(head.toString('ascii',8)),
    };
    if (!valid[mime]) fail('Unsupported file type or file does not match its media type', 415);
}
/** @returns {import('../../shared/wallPost').WallPost} */
function normalize(row) {
    return { id: row.id, platform: row.platform, authorName: row.author_name, handle: row.handle, text: row.text,
        imageUrl: row.image_url, videoUrl: row.video_url, sourceUrl: row.source_url, status: row.status,
        approved: row.status === 'approved', hidden: !!row.hidden, pinned: !!row.pinned,
        revision: row.revision, createdAt: row.created_at };
}
export class WallStore {
    constructor(store, { freeBytes, totalMediaLimit = WALL_MEDIA_BUDGET, eventMediaLimit = EVENT_MEDIA_BUDGET, databaseLimit = MAX_DATABASE_BYTES } = {}) {
        this.store = store; this.db = store.db;
        this.totalMediaLimit = totalMediaLimit; this.eventMediaLimit = eventMediaLimit; this.databaseLimit = databaseLimit;
        this.freeBytes = freeBytes || (() => {
            if (!store.filename) return Number.MAX_SAFE_INTEGER;
            try { const fs = statfsSync(dirname(store.filename)); return fs.bavail * fs.bsize; }
            catch { fail('Upload storage is temporarily unavailable.', 503); }
        });
    }
    storageUsage(id) {
        const total = this.db.query('SELECT COALESCE(SUM(length(data)),0) AS bytes FROM wall_media').get().bytes;
        const event = this.db.query('SELECT COALESCE(SUM(length(data)),0) AS bytes FROM wall_media WHERE event_id=?').get(id).bytes;
        return { totalBytes: total, totalLimit: this.totalMediaLimit, eventBytes: event, eventLimit: this.eventMediaLimit,
            availableBytes: this.freeBytes(), reserveBytes: VOLUME_RESERVE };
    }
    assertUploadCapacity(id, incoming = 0) {
        const usage = this.storageUsage(id);
        if (usage.totalBytes + incoming > usage.totalLimit || usage.eventBytes + incoming > usage.eventLimit) {
            fail('Wall media storage is full. Remove old uploads first.', 413);
        }
        // Allow for database pages, WAL writes and checkpointing, not only the BLOB bytes.
        const dbBytes = this.db.query('PRAGMA page_count').get().page_count * this.db.query('PRAGMA page_size').get().page_size;
        if (usage.availableBytes < VOLUME_RESERVE + incoming * 3 || dbBytes + incoming > this.databaseLimit) {
            fail('Uploads are paused to protect application storage. Ask an organizer to free space.', 507);
        }
    }
    event(name) {
        const row = typeof name === 'string' && this.db.query('SELECT id,name FROM events WHERE name=? OR id=?').get(name,name);
        if (!row) fail('Event not found', 404);
        return row;
    }
    config(id) {
        const row = this.db.query('SELECT * FROM wall_settings WHERE event_id=?').get(id);
        const settings = JSON.parse(row?.settings || '{}');
        delete settings.instagramModerationMode;
        return { ...WALL_DEFAULTS, ...settings, revision: row?.revision || 0,
            xLastPollAt: row?.last_poll_at ? new Date(row.last_poll_at).toISOString() : null,
            xLastPollError: row?.last_poll_error || '',
            instagramLastPollAt: settings.instagramLastPollAt || null,
            instagramLastPollError: settings.instagramLastPollError || '' };
    }
    updateSettings(session, name, patch, revision) {
        const id = this.store.authorize(session, name), validated = validateSettings(patch);
        return this.db.transaction(() => {
            const old = this.config(id);
            if (revision !== old.revision) fail('Wall settings changed. Reload before saving.', 409);
            const settings = Object.fromEntries(Object.keys(WALL_DEFAULTS).map(key => [key, old[key]]));
            settings.instagramLastPollAt = old.instagramLastPollAt || null;
            settings.instagramLastPollError = old.instagramLastPollError || '';
            Object.assign(settings, validated);
            this.db.query(`INSERT INTO wall_settings(event_id,settings,revision) VALUES(?,?,?)
                ON CONFLICT(event_id) DO UPDATE SET settings=excluded.settings,revision=excluded.revision`)
                .run(id, JSON.stringify(settings), revision + 1);
            this.store.touch(id);
            return this.config(id);
        })();
    }
    publicFeed(name, { limit = 200, offset = 0 } = {}) {
        if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0 || offset >= 200) fail('Invalid wall page');
        const { id } = this.event(name), wall = this.config(id);
        const cutoff = new Date(this.store.now() - wall.windowMinutes * 60000).toISOString();
        const total = wall.enabled ? Math.min(200, this.db.query(`SELECT COUNT(*) AS n FROM wall_posts WHERE event_id=? AND deleted=0 AND hidden=0
            AND status='approved' AND (pinned=1 OR created_at>=?)`).get(id, cutoff).n) : 0;
        const posts = total ? this.db.query(`SELECT * FROM wall_posts WHERE event_id=? AND deleted=0 AND hidden=0
            AND status='approved' AND (pinned=1 OR created_at>=?) ORDER BY pinned DESC,created_at DESC,id LIMIT ? OFFSET ?`).all(id, cutoff, Math.min(limit, 200 - offset), offset).map(normalize) : [];
        return { wall: Object.fromEntries(PUBLIC_KEYS.map(key => [key, wall[key]])), posts, total, hasMore: offset + posts.length < total };
    }
    moderationFeed(session, name, view = null) {
        const id=this.store.authorize(session,name);
        if (!view) {
            const posts=this.db.query('SELECT * FROM wall_posts WHERE event_id=? AND deleted=0 ORDER BY pinned DESC,created_at DESC,id LIMIT 1000').all(id).map(normalize);
            return {wall:this.config(id),posts,storage:this.storageUsage(id),stats:{total:posts.length,approved:posts.filter(p=>p.approved&&!p.hidden).length,pending:posts.filter(p=>p.status==='pending').length,rejected:posts.filter(p=>p.status==='rejected').length,hidden:posts.filter(p=>p.hidden).length,pinned:posts.filter(p=>p.pinned).length}};
        }
        const page=Number(view.page ?? 1),perPage=Number(view.perPage ?? 20),search=string(view.search ?? '',200),status=view.status ?? 'all',sort=view.sort ?? 'newest';
        if(!Number.isInteger(page)||page<1||page>1000000||!Number.isInteger(perPage)||perPage<1||perPage>100||!['all','pending','approved','rejected','pinned'].includes(status)||!['newest','oldest'].includes(sort)) fail('Invalid post page or filter');
        const clauses=['event_id=?','deleted=0'],params=[id];
        if(status==='pinned') clauses.push('pinned=1');
        else if(status!=='all'){clauses.push('status=?');params.push(status);}
        if(search){clauses.push("(text || ' ' || author_name || ' ' || handle) LIKE ? ESCAPE '\\'");params.push('%'+search.replace(/[\\%_]/g,'\\$&')+'%');}
        const where=clauses.join(' AND '),totalMatched=this.db.query('SELECT COUNT(*) total FROM wall_posts WHERE '+where).get(...params).total;
        const pageCount=Math.max(1,Math.ceil(totalMatched/perPage)),currentPage=Math.min(page,pageCount);
        const posts=this.db.query('SELECT * FROM wall_posts WHERE '+where+' ORDER BY created_at '+(sort==='oldest'?'ASC':'DESC')+',id LIMIT ? OFFSET ?').all(...params,perPage,(currentPage-1)*perPage).map(normalize);
        const stats=this.db.query(`SELECT COUNT(*) total,COALESCE(SUM(status='approved' AND hidden=0),0) approved,COALESCE(SUM(status='pending'),0) pending,COALESCE(SUM(status='rejected'),0) rejected,COALESCE(SUM(hidden=1),0) hidden,COALESCE(SUM(pinned=1),0) pinned FROM wall_posts WHERE event_id=? AND deleted=0`).get(id);
        return {wall:this.config(id),posts,stats,storage:this.storageUsage(id),pagination:{page:currentPage,perPage,pageCount,totalMatched}};
    }
    /**
     * @param {string} name
     * @param {import('../../shared/wallPost').WallPostInput} input
     * @returns {import('../../shared/wallPost').WallPost | null}
     */
    submit(name, input, media = null, { collected = false } = {}) {
        const { id: eventId } = this.event(name);
        return this.db.transaction(() => {
            const wall = this.config(eventId);
            const platform = collected ? input.platform ?? 'x' : input.platform ?? 'manual';
            if (collected && !['x', 'instagram'].includes(platform)) fail('Invalid collected platform');
            if (!wall.enabled || (collected ? !(platform === 'instagram' ? wall.instagramEnabled : wall.xEnabled) : !wall.publicUploadEnabled)) fail('Public uploads are disabled for this wall.', 403);
            const id = collected ? string(input.id, 100) : randomUUID();
            if (collected && !(platform === 'instagram' ? /^instagram-[a-z\d_-]+$/i : /^x-\d+$/).test(id)) fail('Invalid collected post identifier');
            const existing = collected && this.db.query('SELECT * FROM wall_posts WHERE event_id=? AND id=?').get(eventId,id);
            if (existing) {
                if (platform === 'instagram' && !existing.deleted) {
                    const placeholder = existing.author_name === 'Instagram' && !existing.handle && existing.text === 'Instagram post';
                    const corrected = placeholder
                        ? { authorName: string(input.authorName,80), handle: string(input.handle,80), text: string(input.text,5000) }
                        : { authorName: existing.author_name, handle: existing.handle, text: existing.text };
                    const imageUrl = existing.image_url || url(input.imageUrl), videoUrl = existing.video_url || url(input.videoUrl);
                    if ((corrected.authorName !== existing.author_name || corrected.handle !== existing.handle || corrected.text !== existing.text ||
                        imageUrl !== existing.image_url || videoUrl !== existing.video_url) && filtersAllow(corrected, wall)) {
                        this.db.query('UPDATE wall_posts SET author_name=?,handle=?,text=?,image_url=?,video_url=?,revision=revision+1 WHERE event_id=? AND id=?')
                            .run(corrected.authorName,corrected.handle,corrected.text,imageUrl,videoUrl,eventId,id);
                    }
                }
                return null;
            }
            this.assertUploadCapacity(eventId, media?.data?.length || 0);
            if (this.db.query('SELECT COUNT(*) AS n FROM wall_posts').get().n >= 5000) fail('Wall post storage is full. Ask an organizer to archive the event.', 413);
            const post = { id, platform,
                authorName: string(input.authorName,80), handle: string(input.handle,80), text: string(input.text,5000),
                imageUrl: url(input.imageUrl), videoUrl: url(input.videoUrl), sourceUrl: url(input.sourceUrl) };
            if (!['manual','x','instagram'].includes(post.platform)) fail('Invalid post platform');
            if (media) {
                validateMedia(media.data, media.mime);
                post.imageUrl = ''; post.videoUrl = '';
                post.imageUrl = `/api/wall/${eventId}/media/${id}`;
            }
            if (!post.text && !post.imageUrl && !post.videoUrl) fail('Post description or image is required.');
            if (!filtersAllow(post, wall)) fail('This post is blocked by the wall filters.',422);
            if (this.db.query('SELECT COUNT(*) AS n FROM wall_posts WHERE event_id=? AND deleted=0').get(eventId).n >= 1000) fail('Wall is full. Remove old posts first.',413);
            const createdAt = collected && Number.isFinite(Date.parse(input.createdAt)) ? new Date(input.createdAt).toISOString() : this.store.timestamp();
            const status = collected && wall.moderationMode === 'auto' ? 'approved' : 'pending';
            this.db.query(`INSERT INTO wall_posts(event_id,id,platform,author_name,handle,text,image_url,video_url,source_url,status,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(eventId,id,post.platform,post.authorName,post.handle,post.text,post.imageUrl,post.videoUrl,post.sourceUrl,status,createdAt);
            if (media) this.db.query('INSERT INTO wall_media(event_id,post_id,mime,data) VALUES(?,?,?,?)').run(eventId,id,media.mime,media.data);
            return normalize(this.db.query('SELECT * FROM wall_posts WHERE event_id=? AND id=?').get(eventId,id));
        })();
    }
    action(session, name, input) {
        const id = this.store.authorize(session,name);
        // Stopping is idempotent and independent of the caller's stale settings revision.
        // This path can only turn collection off; enabling still requires a matching revision.
        if (input.action === 'pauseX' || input.action === 'pauseInstagram') {
            const current = this.config(id);
            // Even when already OFF, advance the revision to fence out an older in-flight enable.
            return this.updateSettings(session, name, { [input.action === 'pauseInstagram' ? 'instagramEnabled' : 'xEnabled']: false }, current.revision);
        }
        if (input.action === 'updateSettings') return this.updateSettings(session,name,input.settings,input.revision);
        if (input.action === 'setMode') return this.updateSettings(session,name,{ moderationMode: input.mode },input.revision);
        return this.db.transaction(() => {
            const post = this.db.query('SELECT * FROM wall_posts WHERE event_id=? AND id=? AND deleted=0').get(id,string(input.postId,100));
            if (!post) fail('Post not found',404);
            if (input.revision !== post.revision) fail('Post changed. Reload before trying again.',409);
            switch (input.action) {
                case 'approve': post.status='approved'; post.hidden=0; break;
                case 'reject': post.status='rejected'; post.hidden=1; break;
                case 'unreject': post.status='pending'; post.hidden=0; break;
                case 'hide': post.hidden=1; break;
                case 'unhide': post.hidden=0; break;
                case 'pin': post.pinned=1; break;
                case 'unpin': post.pinned=0; break;
                case 'delete':
                    if (post.status !== 'rejected' && !post.hidden) fail('Only rejected or hidden posts can be deleted.');
                    post.deleted=1;
                    this.db.query('DELETE FROM wall_media WHERE event_id=? AND post_id=?').run(id,post.id);
                    post.image_url=''; post.video_url='';
                    break;
                default: fail('Unsupported social wall action.');
            }
            this.db.query(`UPDATE wall_posts SET status=?,hidden=?,pinned=?,deleted=?,image_url=?,video_url=?,revision=revision+1 WHERE event_id=? AND id=?`)
                .run(post.status,post.hidden,post.pinned,post.deleted,post.image_url,post.video_url,id,post.id);
        })();
    }
    media(session, name, postId) {
        const { id } = this.event(name), wall = this.config(id);
        const viewer = this.store.getSession(session);
        const moderator = viewer?.eventId === id;
        const post = this.db.query('SELECT * FROM wall_posts WHERE event_id=? AND id=? AND deleted=0').get(id,postId);
        const cutoff = new Date(this.store.now() - wall.windowMinutes*60000).toISOString();
        if (!post || (!moderator && (!wall.enabled || post.status !== 'approved' || post.hidden || (!post.pinned && post.created_at < cutoff)))) fail('Media not found',404);
        const media = this.db.query('SELECT mime,data FROM wall_media WHERE event_id=? AND post_id=?').get(id,postId);
        if (!media) fail('Media not found',404);
        return media;
    }
}
