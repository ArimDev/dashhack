export default apiHandler(async event => {
    const name = getRouterParam(event,'event',{ decode: true }), session = getCookie(event,'session');
    const wall = getWallStore();
    getStore().authorize(session,name);
    setHeader(event,'Cache-Control','no-store');
    let view = Object.keys(getQuery(event)).length ? getQuery(event) : null;
    if (event.method === 'POST') {
        const body = await readBody(event);
        if (body.action === 'setSpeed') return { status: 200, data: { wall: wall.updateSettings(session, name, { scrollSpeed: body.speed }, body.revision) } };
        wall.action(session,name,body);
        view = body.view || null;
    }
    else if (event.method !== 'GET') return { status: 405, message: 'Method Not Allowed' };
    return { status: 200, data: { ...wall.moderationFeed(session,name,view), xConfigured: !!useRuntimeConfig().xBearerToken,
        instagramConfigured: !!process.env.NUXT_CAPTAPI_API_KEY } };
});
