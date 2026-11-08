import { connectDB } from './db';
import Event from '../models/Event';

const pollers = new Map();

function normalizeTextList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
    return String(value)
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function normalizeHashtag(value) {
    return String(value || '').trim().replace(/^@+/, '').replace(/\s+/g, '');
}

function normalizeHandle(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const trimmed = text.startsWith('@') ? text.slice(1) : text;
    return trimmed.replace(/\s+/g, '');
}

function buildXQuery(eventDoc) {
    const wall = eventDoc.wall || {};
    const hashtagTerms = normalizeTextList(wall.xQueryHashtags || wall.queryHashtags || []).map((value) => value.startsWith('#') ? value : `#${value}`);
    const handles = normalizeTextList(wall.xQueryHandles || []).map((value) => {
        const cleaned = normalizeHandle(value);
        return cleaned ? `@${cleaned}` : '';
    }).filter(Boolean);

    const terms = [...new Set([...hashtagTerms, ...handles])];
    if (!terms.length) return '';
    return terms.map((term) => term.startsWith('@') ? term : term.replace(/^#/, '#')).join(' OR ');
}

function mapMediaToPoster(tweet, includes = {}) {
    const mediaByKey = new Map((includes.media || []).map((media) => [media.media_key, media]));
    const attachments = tweet.attachments || {};
    const mediaKeys = attachments.media_keys || [];

    const foundMedia = mediaKeys
        .map((key) => mediaByKey.get(key))
        .filter(Boolean)
        .map((media) => {
            if ((media.type || '').toLowerCase() === 'video') {
                const topVariant = (media.variants || []).sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0];
                return {
                    type: 'video',
                    url: topVariant?.url || media.url || '',
                    previewImageUrl: media.preview_image_url || '',
                };
            }

            return {
                type: 'image',
                url: media.url || media.preview_image_url || '',
                previewImageUrl: media.preview_image_url || '',
            };
        })
        .filter((media) => media.url);

    const primaryMedia = foundMedia[0] || {};
    return {
        imageUrl: primaryMedia.type === 'image' ? primaryMedia.url : '',
        videoUrl: primaryMedia.type === 'video' ? primaryMedia.url : ''
    };
}

function normalizeXPost(tweet, user, includes = {}) {
    const { imageUrl, videoUrl } = mapMediaToPoster(tweet, includes);
    const sourceUrl = `https://x.com/${user.username}/status/${tweet.id}`;

    return {
        id: `x-${tweet.id}`,
        platform: 'x',
        authorName: user.name || user.username || 'X User',
        handle: user.username ? `@${user.username}` : '',
        text: tweet.text || '',
        imageUrl,
        videoUrl,
        sourceUrl,
        approved: false,
        hidden: false,
        pinned: false,
        status: 'pending',
        createdAt: tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString(),
    };
}

export async function syncXPostsForEvent(eventName) {
    await connectDB();

    const eventDoc = await Event.findOne({ event: eventName });
    if (!eventDoc) {
        console.warn(`[xPoller] Event "${eventName}": Event not found`);
        return { imported: 0, enabled: false, reason: 'Event not found' };
    }

    const wall = eventDoc.wall || {};
    if (!wall.xEnabled) {
        console.log(`[xPoller] Event "${eventName}": X polling disabled`);
        return { imported: 0, enabled: false, reason: 'X polling disabled' };
    }

    const bearerToken = process.env.X_BEARER_TOKEN || process.env.X_API_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || '';
    if (!bearerToken) {
        console.warn(`[xPoller] Event "${eventName}": Bearer token missing`);
        return { imported: 0, enabled: true, reason: 'Bearer token missing' };
    }

    const query = buildXQuery(eventDoc);
    if (!query) {
        console.log(`[xPoller] Event "${eventName}": No X query terms configured`);
        return { imported: 0, enabled: true, reason: 'No X query terms configured' };
    }

    console.log(`[xPoller] Event "${eventName}": Fetching tweets with query: ${query}`);

    const response = await fetch(`https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(`${query} -is:retweet`)}&max_results=10&tweet.fields=created_at,entities,attachments,author_id,lang&expansions=author_id,attachments.media_keys&user.fields=id,name,username&media.fields=media_key,type,url,preview_image_url,variants`, {
        headers: {
            Authorization: `Bearer ${bearerToken}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const data = await response.text().catch(() => '');
        console.error(`[xPoller] Event "${eventName}": X API request failed (${response.status})`);
        return { imported: 0, enabled: true, reason: `X request failed: ${response.status} ${data.slice(0, 180)}` };
    }

    const payload = await response.json();
    const tweets = Array.isArray(payload?.data) ? payload.data : [];
    const users = Array.isArray(payload?.includes?.users) ? payload.includes.users : [];
    console.log(`[xPoller] Event "${eventName}": Fetched ${tweets.length} tweets from X API, found ${users.length} unique authors`);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const existingIds = new Set((eventDoc.posts || []).map((post) => String(post.id || '').replace(/^x-/, '')));

    let imported = 0;
    let skippedNoUser = 0;
    let skippedDuplicate = 0;
    let skippedFiltered = 0;

    for (const tweet of tweets) {
        const user = userMap.get(tweet.author_id);
        if (!user) {
            skippedNoUser += 1;
            continue;
        }

        const tweetId = String(tweet.id);
        if (existingIds.has(tweetId)) {
            skippedDuplicate += 1;
            continue;
        }

        const normalized = normalizeXPost(tweet, user, payload.includes || {});
        const combinedText = `${normalized.text || ''} ${normalized.handle || ''}`.toLowerCase();
        const matchesWallFilters = !((eventDoc.wall.blacklistedKeywords || []).some((term) => combinedText.includes(String(term || '').trim().toLowerCase())) || (eventDoc.wall.blacklistedAuthors || []).some((term) => (normalized.handle || '').toLowerCase().includes(String(term || '').trim().toLowerCase())));

        if (!matchesWallFilters) {
            skippedFiltered += 1;
            continue;
        }

        eventDoc.posts = eventDoc.posts || [];
        eventDoc.posts.unshift(normalized);
        existingIds.add(tweetId);
        imported += 1;
    }

    console.log(`[xPoller] Event "${eventName}": Added ${imported} posts to DB | Skipped: ${skippedDuplicate} duplicates, ${skippedFiltered} filtered, ${skippedNoUser} missing user`);

    eventDoc.wall.xLastPollAt = new Date();
    await eventDoc.save();

    return { imported, enabled: true, reason: 'OK' };
}

export async function startXPollerForEvent(eventName) {
    await connectDB();

    const eventDoc = await Event.findOne({ event: eventName });
    if (!eventDoc) {
        console.warn(`[xPoller] Event "${eventName}": Cannot start poller, event not found`);
        return { enabled: false, running: false };
    }

    const wall = eventDoc.wall || {};
    if (!wall.xEnabled) {
        console.log(`[xPoller] Event "${eventName}": Poller not started, X polling disabled`);
        return { enabled: false, running: false };
    }

    const intervalMinutes = Number(wall.xPollIntervalMinutes) || 5;
    const intervalMs = Math.max(60_000, intervalMinutes * 60_000);

    const existing = pollers.get(eventName);
    if (existing?.timer) {
        if (existing.intervalMs !== intervalMs) {
            console.log(`[xPoller] Event "${eventName}": Reconfiguring poller interval from ${existing.intervalMs}ms to ${intervalMs}ms`);
            clearInterval(existing.timer);
            const timer = setInterval(() => {
                syncXPostsForEvent(eventName).catch((error) => console.error('[xPoller]', error));
            }, intervalMs);
            pollers.set(eventName, { timer, intervalMs });
        }
        return { enabled: true, running: true };
    }

    console.log(`[xPoller] Event "${eventName}": Starting poller with ${intervalMinutes}min interval (${intervalMs}ms)`);
    const timer = setInterval(() => {
        syncXPostsForEvent(eventName).catch((error) => console.error('[xPoller]', error));
    }, intervalMs);

    pollers.set(eventName, { timer, intervalMs });
    console.log(`[xPoller] Event "${eventName}": Running initial sync...`);
    await syncXPostsForEvent(eventName);
    return { enabled: true, running: true };
}
