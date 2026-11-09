import { WallStore } from '../storage/wall.js';

function instagramPost(result) {
    if (!result || typeof result.url !== 'string') return null;
    let source;
    try { source = new URL(result.url); } catch { return null; }
    if (source.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(source.hostname) || source.username || source.password || source.port) return null;
    const match = source.pathname.match(/^\/(p|reel|reels|tv)\/([a-z\d_-]{1,64})\/?$/i);
    if (!match) return null;
    const handle = typeof result.author === 'string' ? result.author.replace(/^@/, '') : '';
    const validHandle = /^[a-z\d._]{1,30}$/i.test(handle);
    return { id: `instagram-${match[2]}`, platform: 'instagram',
        authorName: validHandle ? handle : 'Instagram', handle: validHandle ? `@${handle}` : '',
        text: typeof result.title === 'string' && result.title.trim() ? result.title.slice(0, 5000) : 'Instagram post',
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
                if (!response.ok) throw new Error(response.status === 429
                    ? 'Captapi rate limit; retrying after at least 15 minutes.'
                    : `Captapi request failed (${response.status}). Check API access, credits and hashtags.`);
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
            const reason = error.message?.startsWith('Captapi ') ? error.message : 'Instagram collection failed. Check API access or available wall storage.';
            this.logger.warn('[Instagram collector] Fetch failed', { eventId: event.id, hashtag: activeHashtag, imported, error: reason });
            this.record(event.id, reason);
            return { imported, error: reason };
        } finally { this.running.delete(event.id); }
    }
    record(id, error) {
        this.store.db.query(`UPDATE wall_settings SET settings=json_set(settings,'$.instagramLastPollAt',?,'$.instagramLastPollError',?) WHERE event_id=?`)
            .run(this.store.timestamp(), error, id);
    }
    async tick() {
        if (!this.key) return;
        const rows = this.store.db.query(`SELECT events.id,events.name FROM events JOIN wall_settings ON events.id=wall_settings.event_id
            WHERE json_extract(settings,'$.enabled')=1 AND json_extract(settings,'$.instagramEnabled')=1`).all();
        for (const row of rows) {
            const wall = this.wall.config(row.id);
            const delay = Math.max(wall.instagramPollIntervalMinutes, wall.instagramLastPollError?.includes('rate limit') ? 15 : 0) * 60000;
            if (!wall.instagramLastPollAt || this.store.now() - Date.parse(wall.instagramLastPollAt) >= delay) await this.syncEvent(row.name);
        }
    }
}