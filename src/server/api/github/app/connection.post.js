export default apiHandler(async event => {
    const { selectionId, installationId } = await readBody(event);
    const app = getGitHubApp(); app.requireConfig();
    // Server-stored choices came from GitHub plus an owner check, not browser input.
    const name = getStore().connectGitHub(getCookie(event, 'session'), selectionId, installationId, app.config.githubAppId);
    return { status: 200, event: name };
});
