export default apiHandler(async event => {
    const name = getRouterParam(event,'event',{ decode: true }), session = getCookie(event,'session');
    const wall = getWallStore();
    getStore().authorize(session,name);
    setHeader(event,'Cache-Control','no-store');
    if (event.method === 'POST') wall.action(session,name,await readBody(event));
    else if (event.method !== 'GET') return { status: 405, message: 'Method Not Allowed' };
    return { status: 200, data: { ...wall.moderationFeed(session,name), xConfigured: !!useRuntimeConfig().xBearerToken } };
});
