import { connectDB } from "../../utils/db";
import Event from "../../models/Event";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

function parseTextList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    return String(value)
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

function normalizePost(post) {
    return {
        id: post.id,
        platform: post.platform || 'manual',
        authorName: post.authorName || '',
        handle: post.handle || '',
        text: post.text || '',
        imageUrl: post.imageUrl || '',
        videoUrl: post.videoUrl || '',
        sourceUrl: post.sourceUrl || '',
        approved: !!post.approved,
        hidden: !!post.hidden,
        pinned: !!post.pinned,
        status: post.status || (post.approved ? 'approved' : 'pending'),
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
    };
}

function matchesTerm(text, terms) {
    if (!terms || !terms.length) return false;
    const haystack = text.toLowerCase();
    return terms.some((term) => term && haystack.includes(term.toLowerCase()));
}

function filtersAllowed(post, wall) {
    const authorText = `${post.authorName || ''} ${post.handle || ''}`.trim();
    const combinedText = `${post.text || ''} ${authorText}`.toLowerCase();

    if (wall.blacklistedAuthors?.length && matchesTerm(authorText, wall.blacklistedAuthors)) {
        return false;
    }

    if (wall.blacklistedKeywords?.length && matchesTerm(combinedText, wall.blacklistedKeywords)) {
        return false;
    }

    return true;
}

function getUploadUrl(fileName, eventName) {
    return `/uploads/${eventName}/${fileName}`;
}

export default defineEventHandler(async (event) => {
    await connectDB();
    const eventName = event.context.params.event;
    const eventDoc = await Event.findOne({ event: eventName });

    if (!eventDoc) {
        return { status: 404, message: 'Event not found' };
    }

    if (event.method === 'POST') {
        const formData = await readMultipartFormData(event);
        const body = formData
            ? Object.fromEntries(formData.filter((part) => !part.filename).map((part) => [part.name, part.data ? part.data.toString('utf-8') : '']))
            : await readBody(event);

        const wall = eventDoc.wall || {
            enabled: true,
            publicUploadEnabled: true,
            moderationMode: 'auto',
            windowMinutes: 1440,
            idleCycleSeconds: 25,
            idleWaitSeconds: 30,
            blacklistedKeywords: [],
            blacklistedAuthors: [],
        };

        if (!wall.enabled || !wall.publicUploadEnabled) {
            return { status: 403, message: 'Public uploads are disabled for this wall.' };
        }

        const text = String(body.text || body.description || '').trim();
        const authorName = String(body.authorName || '').trim();
        const handle = String(body.handle || '').trim();
        const sourceUrl = String(body.sourceUrl || '').trim();
        const imageUrl = String(body.imageUrl || '').trim();
        const videoUrl = String(body.videoUrl || '').trim();
        const platform = String(body.platform || 'manual').toLowerCase();

        let uploadedImageUrl = '';
        let uploadedVideoUrl = '';

        const fileEntry = formData?.find((part) => part.name === 'file' && part.filename);
        if (fileEntry) {
            const extensions = {
                'image/avif': 'avif',
                'image/bmp': 'bmp',
                'image/gif': 'gif',
                'image/heic': 'heic',
                'image/heif': 'heif',
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/tiff': 'tiff',
                'image/webp': 'webp',
                'video/mp4': 'mp4',
                'video/ogg': 'ogv',
                'video/quicktime': 'mov',
                'video/webm': 'webm',
                'video/x-matroska': 'mkv',
            };
            const extension = extensions[fileEntry.type || ''];
            if (!extension) {
                return { status: 415, message: 'Unsupported upload type.' };
            }

            const safeName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
            const uploadRoot = resolve(useRuntimeConfig().uploadsDir);
            const uploadDir = resolve(uploadRoot, eventName);
            if (!uploadDir.startsWith(`${uploadRoot}${sep}`)) {
                return { status: 400, message: 'Invalid event upload path.' };
            }

            await mkdir(uploadDir, { recursive: true });

            const targetPath = join(uploadDir, safeName);
            await writeFile(targetPath, fileEntry.data);

            if ((fileEntry.type || '').startsWith('video/')) {
                uploadedVideoUrl = getUploadUrl(safeName, eventName);
            } else {
                uploadedImageUrl = getUploadUrl(safeName, eventName);
            }
        }

        const finalImageUrl = uploadedImageUrl || imageUrl;
        const finalVideoUrl = uploadedVideoUrl || videoUrl;

        if (!text && !finalImageUrl && !finalVideoUrl) {
            return { status: 400, message: 'Post description, image or video is required.' };
        }

        const draftPost = {
            id: crypto.randomUUID(),
            platform: ['x', 'instagram', 'manual'].includes(platform) ? platform : 'manual',
            authorName,
            handle,
            text,
            imageUrl: finalImageUrl,
            videoUrl: finalVideoUrl,
            sourceUrl,
            approved: false,
            hidden: false,
            pinned: false,
            status: 'pending',
            createdAt: new Date(),
        };

        const allowed = filtersAllowed(draftPost, wall);
        if (!allowed) {
            return { status: 422, message: 'This post is blocked by the wall filters.' };
        }

        eventDoc.posts = eventDoc.posts || [];
        eventDoc.posts.unshift(draftPost);
        await eventDoc.save();

        return {
            status: 200,
            message: 'Post submitted for manual approval.',
            data: normalizePost(draftPost),
        };
    }

    const wall = eventDoc.wall || {
        enabled: true,
        publicUploadEnabled: true,
        moderationMode: 'auto',
        windowMinutes: 1440,
        idleCycleSeconds: 25,
        idleWaitSeconds: 30,
        blacklistedKeywords: [],
        blacklistedAuthors: [],
    };

    if (!wall.enabled) {
        return {
            status: 200,
            message: 'Wall unavailable for this event.',
            data: { wall, posts: [] },
        };
    }

    const cutoff = new Date(Date.now() - (Number(wall.windowMinutes || 1440) * 60 * 1000));
    const posts = (eventDoc.posts || [])
        .filter((post) => {
            if (!post || post.hidden || post.deleted) return false;
            if (post.status !== 'approved') return false;
            if (post.pinned) return true;
            const createdAt = new Date(post.createdAt || Date.now());
            return createdAt >= cutoff;
        })
        .map(normalizePost)
        .sort((a, b) => {
            if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    return {
        status: 200,
        message: 'Wall posts fetched successfully',
        data: {
            wall,
            posts,
        },
    };
});
