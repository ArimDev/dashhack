import { connectDB } from "../../../utils/db";
import Event from "../../../models/Event";
import Session from "../../../models/Session";

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
        deleted: !!post.deleted,
        status: post.status || (post.approved ? 'approved' : 'pending'),
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
    };
}

export default defineEventHandler(async (event) => {
    await connectDB();
    const eventName = event.context.params.event;
    const sessionID = getCookie(event, 'session');

    if (!sessionID) {
        return { status: 401, message: 'Login required.' };
    }

    const session = await Session.findOne({ sessionID, username: eventName });
    if (!session) {
        return { status: 401, message: 'Invalid session.' };
    }

    const eventDoc = await Event.findOne({ event: eventName });
    if (!eventDoc) {
        return { status: 404, message: 'Event not found.' };
    }

    const wall = eventDoc.wall || {
        enabled: true,
        publicUploadEnabled: true,
        moderationMode: 'auto',
        windowMinutes: 180,
        idleCycleSeconds: 25,
        idleWaitSeconds: 30,
        blacklistedKeywords: [],
        blacklistedAuthors: [],
    };

    if (event.method === 'POST') {
        const body = await readBody(event);
        const { action, postId, mode, settings } = body;
        const post = (eventDoc.posts || []).find((item) => item.id === postId);

        if (!post && !['setMode', 'updateSettings'].includes(action)) {
            return { status: 404, message: 'Post not found.' };
        }

        switch (action) {
            case 'approve':
                post.approved = true;
                post.status = 'approved';
                post.hidden = false;
                break;
            case 'reject':
                post.approved = false;
                post.status = 'rejected';
                post.hidden = true;
                break;
            case 'unreject':
                post.approved = false;
                post.status = 'pending';
                post.hidden = false;
                break;
            case 'hide':
                post.hidden = true;
                break;
            case 'unhide':
                post.hidden = false;
                break;
            case 'pin':
                post.pinned = true;
                break;
            case 'unpin':
                post.pinned = false;
                break;
            case 'delete':
                if (post.status !== 'rejected' && !post.hidden) {
                    return { status: 400, message: 'Only rejected or hidden posts can be deleted.' };
                }
                post.deleted = true;
                break;
            case 'setMode':
                wall.moderationMode = mode === 'manual' ? 'manual' : 'auto';
                break;
            case 'updateSettings':
                Object.assign(wall, settings || {});
                break;
            default:
                return { status: 400, message: 'Unsupported social wall action.' };
        }

        await eventDoc.save();

        return {
            status: 200,
            message: 'Social wall action applied.',
            data: {
                wall,
                posts: (eventDoc.posts || []).filter((post) => !post.deleted).map(normalizePost).sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            },
        };
    }

    const posts = (eventDoc.posts || []).filter((post) => !post.deleted).map(normalizePost).sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const stats = {
        total: posts.length,
        approved: posts.filter((post) => post.approved && !post.hidden).length,
        pending: posts.filter((post) => post.status === 'pending').length,
        hidden: posts.filter((post) => post.hidden).length,
        rejected: posts.filter((post) => post.status === 'rejected').length,
        pinned: posts.filter((post) => post.pinned).length,
    };

    return {
        status: 200,
        message: 'Social wall loaded.',
        data: {
            wall,
            posts,
            stats,
        },
    };
});
