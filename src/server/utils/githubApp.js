import { GitHubAppService, parseGitHubRepository } from '../services/github-app.js';
import { StorageError } from '../storage/sqlite.js';
let service;
export function getGitHubApp() {
    return service ||= new GitHubAppService(useRuntimeConfig());
}
export async function githubCredential(name, repository) {
    const store = getStore(), event = store.getEvent(name);
    if (!event) throw new StorageError(404, 'Event not found');
    if (repository && !event.teams.some(team => {
        try { return parseGitHubRepository(team.github).toLowerCase() === repository.toLowerCase(); } catch { return false; }
    })) throw new StorageError(403, 'This repository is not assigned to a team in this event');
    const connection = store.githubConnection(name);
    if (connection) {
        const app = getGitHubApp();
        if (connection.app_id !== String(app.config.githubAppId)) throw new StorageError(403, 'Reconnect this event to the configured GitHub App');
        return app.installationToken(connection.installation_id);
    }
    if (event.settings.githubToken) return event.settings.githubToken;
    throw new StorageError(401, 'Connect a GitHub App or set an event GitHub token');
}
