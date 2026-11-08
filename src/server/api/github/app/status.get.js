export default apiHandler(event => {
    const name = getQuery(event).event;
    getStore().authorize(getCookie(event, 'session'), name);
    const app = getGitHubApp();
    const connection = getStore().githubConnection(name);
    setHeader(event, 'Cache-Control', 'no-store');
    return { status: 200, configured: app.configured, installUrl: app.configured ? app.installUrl : null,
        connection: connection ? { account: connection.account, type: connection.account_type } : null };
});
