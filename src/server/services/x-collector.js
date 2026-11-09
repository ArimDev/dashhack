import { WallStore } from '../storage/wall.js';

export function buildXQuery(wall) {
    const hashtags = wall.xQueryHashtags.length ? wall.xQueryHashtags : wall.queryHashtags;
    const terms = [...hashtags, ...wall.xQueryHandles.map(handle => `from:${handle.replace(/^@/,'')}`)];
    return terms.length ? `(${[...new Set(terms)].join(' OR ')}) -is:retweet` : '';
}
function mediaFor(tweet, includes) {
    const media = includes.media?.find(item => tweet.attachments?.media_keys?.includes(item.media_key));
    if (!media) return {};
    if (['video','animated_gif'].includes(media.type)) {
        const variants = (media.variants || []).filter(item => item.content_type === 'video/mp4' && item.url?.startsWith('https://'));
        // Prefer a small video rather than the largest variant on the public wall.
        variants.sort((a,b) => (a.bit_rate || 0) - (b.bit_rate || 0));
        return { videoUrl: variants[0]?.url || '', imageUrl: variants.length ? '' : media.preview_image_url || '' };
    }
    return { imageUrl: media.url || media.preview_image_url || '' };
}
export class XCollector {
    constructor(store, token, { request = fetch, logger = console } = {}) { this.store=store; this.wall=new WallStore(store); this.token=token; this.request=request; this.logger=logger; this.running=new Set(); }
    async syncEvent(name) {
        const event = this.wall.event(name), config = this.wall.config(event.id);
        if (!this.token || !config.enabled || !config.xEnabled || this.running.has(event.id)) return { imported: 0 };
        const query = buildXQuery(config);
        if (!query) {
            this.logger.warn('[X collector] No query configured', { eventId: event.id });
            return { imported: 0 };
        }
        this.running.add(event.id);
        let imported = 0;
        try {
            this.logger.info('[X collector] Fetch started', { eventId: event.id });
            const params = new URLSearchParams({ query, max_results: '100',
                'tweet.fields': 'created_at,attachments,author_id', expansions: 'author_id,attachments.media_keys',
                'user.fields': 'name,username', 'media.fields': 'type,url,preview_image_url,variants' });
            const response = await this.request(`https://api.x.com/2/tweets/search/recent?${params}`, {
                headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
                redirect: 'error', signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error(response.status === 429 ? 'X API rate limit; retrying after at least 15 minutes.' : `X API request failed (${response.status}). Check API access and token.`);
            const payload = await response.json();
            const users = new Map((payload.includes?.users || []).map(user => [user.id,user]));
            const tweets = (Array.isArray(payload.data) ? payload.data : []).slice(0,100);
            let duplicates = 0, invalid = 0, rejected = 0;
            for (const tweet of tweets) {
                const user = users.get(tweet.author_id);
                if (!user || !/^\d+$/.test(tweet.id) || !/^[a-z\d_]{1,15}$/i.test(user.username)) { invalid++; continue; }
                try {
                    /** @type {import('../../shared/wallPost').CollectedWallPost} */
                    const input = { id: `x-${tweet.id}`, platform: 'x', authorName: user.name || user.username,
                        handle: `@${user.username}`, text: tweet.text || '', createdAt: tweet.created_at,
                        sourceUrl: `https://x.com/${user.username}/status/${tweet.id}`, ...mediaFor(tweet,payload.includes || {}) };
                    const post = this.wall.submit(name,input,null,{ collected: true });
                    if (post) imported++;
                    else duplicates++;
                } catch (error) {
                    if (![400,403,422].includes(error.status)) throw error;
                    rejected++;
                }
            }
            this.logger.info('[X collector] Fetch succeeded', { eventId: event.id, status: response.status,
                fetched: tweets.length, imported, duplicates, invalid, rejected, approvalMode: config.moderationMode });
            this.record(event.id,'');
            return { imported };
        } catch (error) {
            const reason = error.message?.startsWith('X API') ? error.message : 'X collection failed. Check API access or available wall storage.';
            this.logger.warn('[X collector] Fetch failed', { eventId: event.id, imported, error: reason });
            this.record(event.id,reason);
            return { imported, error: reason };
        } finally { this.running.delete(event.id); }
    }
    record(id,error) {
        this.store.db.query('UPDATE wall_settings SET last_poll_at=?,last_poll_error=? WHERE event_id=?').run(this.store.now(),error,id);
    }
    async tick() {
        if (!this.token) return;
        const rows = this.store.db.query(`SELECT events.id,events.name FROM events JOIN wall_settings ON events.id=wall_settings.event_id
            WHERE json_extract(settings,'$.enabled')=1 AND json_extract(settings,'$.xEnabled')=1`).all();
        for (const row of rows) {
            const wall = this.wall.config(row.id);
            const delay = Math.max(wall.xPollIntervalMinutes,wall.xLastPollError?.includes('rate limit') ? 15 : 0) * 60000;
            if (!wall.xLastPollAt || this.store.now() - Date.parse(wall.xLastPollAt) >= delay) await this.syncEvent(row.name);
        }
    }
}
