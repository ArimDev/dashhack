import { StorageError } from '../../../storage/sqlite.js';
export default apiHandler(async event => {
    const { state, code } = await readBody(event);
    setHeader(event, 'Cache-Control', 'no-store');
    if (typeof state !== 'string' || state !== getCookie(event, 'github_app_state')) throw new StorageError(400, 'GitHub connection could not be verified. Connect again from event Settings.');
    const session = getCookie(event, 'session');
    const flow = getStore().consumeGitHubFlow(session, state);
    deleteCookie(event, 'github_app_state', { path: '/' });
    const app = getGitHubApp();
    const token = await app.exchange(code, flow.verifier);
    const choices = await app.eligibleInstallations(token);
    // The user token is deliberately not persisted or returned to the browser.
    const selection = getStore().beginGitHubFlow(session, flow.event, choices);
    return { status: 200, event: flow.event, selectionId: selection.id, choices, installUrl: app.installUrl };
});
