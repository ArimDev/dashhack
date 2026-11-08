import { StorageError } from '../../../storage/sqlite.js';
export default apiHandler(async event => {
    const { event: name, page = '1' } = getQuery(event);
    getStore().authorize(getCookie(event, 'session'), name);
    const connection = getStore().githubConnection(name);
    if (!connection) throw new StorageError(400, 'Connect the event to a GitHub App in Settings first');
    const app = getGitHubApp();
    if (connection.app_id !== String(app.config.githubAppId)) throw new StorageError(403, 'Reconnect this event to the configured GitHub App');
    setHeader(event, 'Cache-Control', 'no-store');
    return { status: 200, ...await app.repositories(connection.installation_id, Number(page)) };
});
