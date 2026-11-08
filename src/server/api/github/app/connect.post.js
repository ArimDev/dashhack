export default apiHandler(async event => {
    const { event: name } = await readBody(event);
    const app = getGitHubApp(); app.requireConfig();
    const flow = getStore().beginGitHubFlow(getCookie(event, 'session'), name);
    setCookie(event, 'github_app_state', flow.id, { httpOnly: true, secure: !import.meta.dev, sameSite: 'lax', path: '/', maxAge: 600 });
    setHeader(event, 'Cache-Control', 'no-store');
    return { status: 200, url: app.authorizeUrl(flow) };
});
