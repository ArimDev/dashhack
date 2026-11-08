export default apiHandler(async event => {
    const name = getRouterParam(event,'event',{ decode: true });
    const wall = getWallStore();
    setHeader(event,'Cache-Control','no-store');
    if (event.method === 'GET') return { status: 200, data: wall.publicFeed(name) };
    if (event.method !== 'POST') return { status: 405, message: 'Method Not Allowed' };
    const config = wall.config(wall.event(name).id);
    if (!config.enabled || !config.publicUploadEnabled) return { status: 403, message: 'Public uploads are disabled for this wall.' };
    checkWallUploadRate(event);
    const { input, media } = await readWallSubmission(event);
    const post = wall.submit(name,input,media);
    return { status: 200, message: 'Post submitted for manual approval.', data: post };
});
