import { WallStore } from '../storage/wall.js';

async function captapiFailure(response) {
    // Never retain the raw provider body: it can contain URLs or credentials.
    const payload = await response.json().catch(() => null);
    const details = payload?.error;
    const hints = [details?.reason, details?.code, details?.message, typeof details === 'string' ? details : '', payload?.code];
    const loginWall = hints.some(value => typeof value === 'string' && /login[_ -]wall/i.test(value));
    let message;
    if (loginWall) message = `Captapi cannot fetch Instagram because Instagram requires login from its scraper (login_wall, HTTP ${response.status}). Existing posts are preserved.`;
    else if (response.status === 429) message = 'Captapi rate limit; retrying after at least 15 minutes.';
    else if (response.status === 401 || response.status === 403) message = `Captapi rejected API access (HTTP ${response.status}). Check the provider key and permissions.`;
    else if (response.status === 402) message = 'Captapi has insufficient credits. Check the provider account.';
    else if (response.status === 404) message = 'Captapi could not find this Instagram hashtag (HTTP 404). Check the saved hashtag.';
    else if (response.status >= 500) message = `Captapi is temporarily unable to fetch Instagram (HTTP ${response.status}). Existing posts are preserved; automatic retries will back off.`;
    else message = `Captapi rejected the Instagram request (HTTP ${response.status}). Check the saved hashtag and provider configuration.`;
    const error = new Error(message);
    error.providerFailure = true;
    error.permanent = [400,401,402,403,404,422].includes(response.status) || details?.retryable === false;
    error.persistent = details?.persistent === true;
    const requestId = response.headers.get('x-captapi-request-id') || payload?.requestId;
    error.requestId = typeof requestId === 'string' && /^[a-f\d-]{16,64}$/i.test(requestId) ? requestId : '';
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

/** @returns {import('../../shared/wallPost').CollectedWallPost | null} */
function instagramPost(result) {
    if (!result || typeof result.url !== 'string') return null;
    let source;
    try { source = new URL(result.url); } catch { return null; }
    if (source.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(source.hostname) || source.username || source.password || source.port) return null;
    const match = source.pathname.match(/^\/(p|reel|reels|tv)\/([a-z\d_-]{1,64})\/?$/i);
    if (!match) return null;
    const username = typeof result.author === 'string' ? result.author : result.author?.username;
    const handle = typeof username === 'string' ? username.replace(/^@/, '') : '';
    const validHandle = /^[a-z\d._]{1,30}$/i.test(handle);
    const displayName = result.author?.displayName;
    const text = typeof result.caption === 'string' && result.caption.trim() ? result.caption : result.title;
    const firstMedia = Array.isArray(result.children) ? result.children[0] : null;
    const publishedAt = typeof result.publishedAt === 'string' ? Date.parse(result.publishedAt) : NaN;
    return { id: `instagram-${match[2]}`, platform: 'instagram',
        authorName: typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 80) : validHandle ? handle : 'Instagram',
        handle: validHandle ? `@${handle}` : '',
        text: typeof text === 'string' && text.trim() ? text.slice(0, 5000) : 'Instagram post',
        imageUrl: mediaUrl(result.thumbnailUrl) || mediaUrl(firstMedia?.thumbnailUrl),
        videoUrl: mediaUrl(result.videoUrl) || mediaUrl(firstMedia?.videoUrl),
        createdAt: Number.isFinite(publishedAt) ? new Date(publishedAt).toISOString() : undefined,
        sourceUrl: `https://www.instagram.com/${match[1] === 'reels' ? 'reel' : match[1]}/${match[2]}/` };
}

export class InstagramCollector {
    constructor(store, key, { request = fetch, logger = console } = {}) {
        this.store = store; this.wall = new WallStore(store); this.key = key; this.request = request; this.logger = logger; this.running = new Set();
    }
    async syncEvent(name) {
        const event = this.wall.event(name), config = this.wall.config(event.id);
        if (!this.key || !config.enabled || !config.instagramEnabled || this.running.has(event.id)) return { imported: 0 };
        const hashtags = [...new Set(config.instagramQueryHashtags.map(tag => tag.replace(/^#/, '').toLowerCase()))];
        if (!hashtags.length) {
            this.logger.warn('[Instagram collector] No hashtags configured', { eventId: event.id });
            return { imported: 0 };
        }
        this.running.add(event.id);
        let imported = 0;
        let activeHashtag;
        try {
            for (const hashtag of hashtags) {
                const current = this.wall.config(event.id);
                if (!current.enabled || !current.instagramEnabled) break;
                activeHashtag = hashtag;
                this.logger.info('[Instagram collector] Fetch started', { eventId: event.id, hashtag });
                const params = new URLSearchParams({ q: hashtag, limit: '50', cache: 'false' });
                const response = await this.request(`https://api.captapi.com/v1/instagram/hashtag-search?${params}`, {
                    headers: { Authorization: `Bearer ${this.key}`, Accept: 'application/json' },
                    redirect: 'error', signal: AbortSignal.timeout(95000),
                });
                if (!response.ok) throw await captapiFailure(response);
                const payload = await response.json();
                if (payload.success !== true || !Array.isArray(payload.data?.results)) throw new Error('Captapi returned an invalid search response.');
                const results = payload.data.results.slice(0, 50);
                let added = 0, duplicates = 0, invalid = 0, rejected = 0;
                for (const result of results) {
                    const post = instagramPost(result);
                    if (!post) { invalid++; continue; }
                    try {
                        if (this.wall.submit(name, post, null, { collected: true })) { imported++; added++; }
                        else duplicates++;
                    } catch (error) {
                        if (![400, 403, 422].includes(error.status)) throw error;
                        rejected++;
                    }
                }
                this.logger.info('[Instagram collector] Fetch succeeded', { eventId: event.id, hashtag,
                    status: response.status, fetched: results.length, imported: added, duplicates, invalid, rejected,
                    approvalMode: current.moderationMode });
            }
            this.record(event.id, '');
            return { imported };
        } catch (error) {
            const reason = error.message;
            const retry = this.record(event.id, reason, error);
            this.logger.warn('[Instagram collector] Fetch failed', { eventId: event.id, hashtag: activeHashtag, imported,
                error: reason, requestId: retry.requestId, nextPollAt: retry.nextPollAt });
            return { imported, error: reason };
        } finally { this.running.delete(event.id); }
    }
    record(id, error, details = {}) {
        const current = this.wall.config(id);
        const failures = error ? Math.min(10, (Number(current.instagramFailureCount) || 0) + 1) : 0;
        const backoffMinutes = error ? Math.max(current.instagramPollIntervalMinutes,
            details.permanent || details.persistent ? 60 : Math.min(60, 15 * 2 ** (failures - 1))) : 0;
        const retryMs = Math.min(24 * 3600000, Math.max(backoffMinutes * 60000, Number(details.retryAfterMs) || 0));
        const nextPollAt = error ? new Date(this.store.now() + retryMs).toISOString() : null;
        const requestId = details.requestId || '';
        this.store.db.query(`UPDATE wall_settings SET settings=json_set(settings,'$.instagramLastPollAt',?,'$.instagramLastPollError',?,
            '$.instagramFailureCount',?,'$.instagramNextPollAt',?,'$.instagramLastRequestId',?) WHERE event_id=?`)
            .run(this.store.timestamp(), error, failures, nextPollAt, requestId, id);
        return { nextPollAt, requestId };
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
