import { normalizeWallMedia } from '../../services/wall-image.js';
import { stopWallBody } from '../../services/wall-body.js';

export default apiHandler(async event => {
    const name = getRouterParam(event,'event',{ decode: true });
    const wall = getWallStore();
    setHeader(event,'Cache-Control','no-store');
    if (event.method === 'GET') return { status: 200, data: wall.publicFeed(name) };
    if (event.method !== 'POST') return { status: 405, message: 'Method Not Allowed' };
    const config = wall.config(wall.event(name).id);
    if (!config.enabled || !config.publicUploadEnabled) return { status: 403, message: 'Public uploads are disabled for this wall.' };
    let release;
    try {
        release = checkWallUploadRate(event);
        wall.assertUploadCapacity(wall.event(name).id);
        const { input, media } = await readWallSubmission(event);
        const post = wall.submit(name,input,await normalizeWallMedia(media));
        return { status: 200, message: 'Post submitted for manual approval.', data: post };
    } catch (error) {
        if (!event.node.req.readableEnded) stopWallBody(event.node.req, event.node.res);
        throw error;
    } finally { release?.(); }
});
