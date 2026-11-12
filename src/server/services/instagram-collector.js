import { WallStore, filtersAllow } from '../storage/wall.js';
import { normalizeWallMedia } from './wall-image.js';
import { MAX_UPLOAD_BYTES } from '../../shared/wallUploads.js';

// Apify task (apify/instagram-scraper, #atthack). The app starts it at the configured polling interval.
export const APIFY_INSTAGRAM_TASK_ID = 'EfFPXy7N73Gc1JTMQ';
const ACTIVE_RUN = ['READY', 'RUNNING', 'TIMING-OUT', 'ABORTING'];
const MEDIA_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

function instagramFailureReason(error) {
    if (error.providerFailure || error.message === 'Apify returned an invalid dataset response.') return error.message;
    if (['TimeoutError', 'AbortError'].includes(error.name)) return 'Apify Instagram request timed out. Automatic retries will back off.';
    // Preserve useful transport diagnostics without persisting arbitrary request URLs/headers/keys.
    const certificateErrors = [
        [/unable to verify (?:the )?first certificate/i, 'Unable to verify the first certificate'],
        [/certificate has expired/i, 'Certificate has expired'],
        [/self[- ]signed certificate/i, 'Self-signed certificate in the certificate chain'],
    ];
    for (const [pattern, message] of certificateErrors) if (pattern.test(error.message || '')) return message;
    const code = error.code || error.cause?.code;
    if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(code)) return `Apify connection failed (${code}). Automatic retries will back off.`;
    return 'Instagram collection failed. Check API access or available wall storage.';
}

async function apifyFailure(response) {
    // Never retain the raw provider body: it can contain URLs or credentials.
    let message;
    if (response.status === 429) message = 'Apify rate limit; retrying after at least 15 minutes.';
    else if (response.status === 401 || response.status === 403) message = `Apify rejected API access (HTTP ${response.status}). Check the API token and permissions.`;
    else if (response.status === 402) message = 'Apify has insufficient credits. Check the provider account.';
    else if (response.status === 404) message = 'Apify could not find the Instagram task or a finished run yet (HTTP 404). Check the task; a first run may still be in progress.';
    else if (response.status >= 500) message = `Apify is temporarily unavailable (HTTP ${response.status}). Existing posts are preserved; automatic retries will back off.`;
    else message = `Apify rejected the Instagram request (HTTP ${response.status}). Check the task configuration.`;
    const error = new Error(message);
    error.providerFailure = true;
    error.permanent = [400,401,402,403].includes(response.status);
    const retryAfter = response.headers.get('retry-after');
    error.retryAfterMs = /^\d+$/.test(retryAfter || '') ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now()) || 0;
    return error;
}

function mediaUrl(value) {
    if (typeof value !== 'string' || value.length > 2000) return '';
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.href.length <= 2000 ? parsed.href : '';
    } catch { return ''; }
}

async function readBounded(response, limit) {
    const length = Number(response.headers.get('content-length'));
    if (length > limit || !response.body) return null;
    const reader = response.body.getReader(), chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) return Buffer.concat(chunks);
        size += value.length;
        if (size > limit) { await reader.cancel(); return null; }
        chunks.push(value);
    }
}

/** Maps one Apify instagram-scraper dataset item. `imageUrl` is the CDN source to download, never stored. */
function instagramPost(result) {
    if (!result) return null;
    const raw = typeof result.url === 'string' ? result.url
        : typeof result.shortCode === 'string' ? `https://www.instagram.com/p/${result.shortCode}/` : null;
    if (!raw) return null;
    let source;
    try { source = new URL(raw); } catch { return null; }
    if (source.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(source.hostname) || source.username || source.password || source.port) return null;
    const match = source.pathname.match(/^\/(p|reel|reels|tv)\/([a-z\d_-]{1,64})\/?$/i);
    if (!match) return null;
    const handle = typeof result.ownerUsername === 'string' ? result.ownerUsername.replace(/^@/, '') : '';
    const validHandle = /^[a-z\d._]{1,30}$/i.test(handle);
    const displayName = result.ownerFullName;
    const text = result.caption;
    const firstChild = Array.isArray(result.childPosts) ? result.childPosts[0] : null;
    const publishedAt = typeof result.timestamp === 'string' ? Date.parse(result.timestamp) : NaN;
    return { id: `instagram-${match[2]}`, platform: 'instagram',
        authorName: typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 80) : validHandle ? handle : 'Instagram',
        handle: validHandle ? `@${handle}` : '',
        text: typeof text === 'string' && text.trim() ? text.slice(0, 5000) : 'Instagram post',
        imageUrl: mediaUrl(result.displayUrl) || mediaUrl(firstChild?.displayUrl) || mediaUrl(result.images?.[0]),
        createdAt: Number.isFinite(publishedAt) ? new Date(publishedAt).toISOString() : undefined,
        sourceUrl: `https://www.instagram.com/${match[1] === 'reels' ? 'reel' : match[1]}/${match[2]}/` };
}

export class InstagramCollector {
    constructor(store, key, { request = fetch, logger = console, taskId = APIFY_INSTAGRAM_TASK_ID } = {}) {
        this.store = store; this.wall = new WallStore(store); this.key = key; this.request = request; this.logger = logger;
        this.taskId = taskId; this.running = new Set();
    }
    /** Downloads an Instagram CDN photo and re-encodes it like a public upload; null when unavailable. */
    async downloadImage(value) {
        try {
            if (!value || !MEDIA_HOST.test(new URL(value).hostname)) return null;
            const response = await this.request(value, { redirect: 'error', signal: AbortSignal.timeout(20000) });
            const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
            if (!response.ok || !MEDIA_TYPES.includes(mime)) return null;
            const data = await readBounded(response, MAX_UPLOAD_BYTES);
            return data ? await normalizeWallMedia({ mime, data }) : null;
        } catch { return null; }
    }
    async apify(path, init = {}, { allowMissing = false } = {}) {
        const response = await this.request(`https://api.apify.com/v2/actor-tasks/${encodeURIComponent(this.taskId)}${path}`, {
            ...init, headers: { Authorization: `Bearer ${this.key}`, Accept: 'application/json' },
            redirect: 'error', signal: AbortSignal.timeout(90000),
        });
        if (allowMissing && response.status === 404) return null;
        if (!response.ok) throw await apifyFailure(response);
        return response;
    }
    active(id) {
        const current = this.wall.config(id);
        return current.enabled && current.instagramEnabled;
    }
    async syncEvent(name) {
        const event = this.wall.event(name), config = this.wall.config(event.id);
        if (!this.key || !config.enabled || !config.instagramEnabled || this.running.has(event.id)) return { imported: 0 };
        this.running.add(event.id);
        let imported = 0;
        try {
            this.logger.info('[Instagram collector] Fetch started', { eventId: event.id, taskId: this.taskId });
            // Start one scrape per polling interval unless one is still running, waiting briefly for it.
            // A run that outlasts the wait is imported on the next poll.
            const last = await (await this.apify('/runs/last', {}, { allowMissing: true }))?.json();
            if (!this.active(event.id)) return { imported: 0 };
            if (!ACTIVE_RUN.includes(last?.data?.status)) {
                await this.apify('/runs?waitForFinish=60', { method: 'POST' });
                if (!this.active(event.id)) return { imported: 0 };
            }
            const params = new URLSearchParams({ status: 'SUCCEEDED', clean: 'true', limit: '50' });
            const response = await this.apify(`/runs/last/dataset/items?${params}`);
            const payload = await response.json();
            if (!Array.isArray(payload)) throw new Error('Apify returned an invalid dataset response.');
            const results = payload.slice(0, 50);
            let duplicates = 0, invalid = 0, rejected = 0, mediaFailed = 0;
            for (const result of results) {
                if (!this.active(event.id)) break;
                const parsed = instagramPost(result);
                if (!parsed) { invalid++; continue; }
                const { imageUrl, ...post } = parsed;
                try {
                    // Existing posts only get placeholder text repairs; photos are downloaded once, for new posts.
                    if (this.store.db.query('SELECT 1 FROM wall_posts WHERE event_id=? AND id=?').get(event.id, post.id)) {
                        this.wall.submit(name, post, null, { collected: true }); duplicates++; continue;
                    }
                    // Skip blocked posts before spending a photo download on them.
                    if (!filtersAllow(post, this.wall.config(event.id))) { rejected++; continue; }
                    const media = await this.downloadImage(imageUrl);
                    // Retry on the next poll: the latest run carries fresh CDN links.
                    if (!media) { mediaFailed++; continue; }
                    if (this.wall.submit(name, post, media, { collected: true })) imported++;
                    else duplicates++;
                } catch (error) {
                    if (![400, 403, 422].includes(error.status)) throw error;
                    rejected++;
                }
            }
            this.logger.info('[Instagram collector] Fetch succeeded', { eventId: event.id, taskId: this.taskId,
                status: response.status, fetched: results.length, imported, duplicates, invalid, rejected, mediaFailed,
                approvalMode: this.wall.config(event.id).moderationMode });
            this.record(event.id, '');
            return { imported };
        } catch (error) {
            const reason = instagramFailureReason(error);
            const retry = this.record(event.id, reason, error);
            this.logger.warn('[Instagram collector] Fetch failed', { eventId: event.id, taskId: this.taskId, imported,
                error: reason, nextPollAt: retry.nextPollAt });
            return { imported, error: reason };
        } finally { this.running.delete(event.id); }
    }
    record(id, error, details = {}) {
        const current = this.wall.config(id);
        const failures = error ? Math.min(10, (Number(current.instagramFailureCount) || 0) + 1) : 0;
        const backoffMinutes = error ? Math.max(current.instagramPollIntervalMinutes,
            details.permanent ? 60 : Math.min(60, 15 * 2 ** (failures - 1))) : 0;
        const retryMs = Math.min(24 * 3600000, Math.max(backoffMinutes * 60000, Number(details.retryAfterMs) || 0));
        const nextPollAt = error ? new Date(this.store.now() + retryMs).toISOString() : null;
        this.store.db.query(`UPDATE wall_settings SET settings=json_set(settings,'$.instagramLastPollAt',?,'$.instagramLastPollError',?,
            '$.instagramFailureCount',?,'$.instagramNextPollAt',?,'$.instagramLastRequestId',?) WHERE event_id=?`)
            .run(this.store.timestamp(), error, failures, nextPollAt, '', id);
        return { nextPollAt };
    }
    async tick() {
        if (!this.key) return;
        const rows = this.store.db.query(`SELECT events.id,events.name FROM events JOIN wall_settings ON events.id=wall_settings.event_id
            WHERE json_extract(settings,'$.enabled')=1 AND json_extract(settings,'$.instagramEnabled')=1`).all();
        for (const row of rows) {
            const wall = this.wall.config(row.id);
            if (Date.parse(wall.instagramNextPollAt) > this.store.now()) continue;
            const delay = Math.max(wall.instagramPollIntervalMinutes, wall.instagramLastPollError?.includes('rate limit') ? 15 : 0) * 60000;
            if (!wall.instagramLastPollAt || this.store.now() - Date.parse(wall.instagramLastPollAt) >= delay) await this.syncEvent(row.name);
        }
    }
}
