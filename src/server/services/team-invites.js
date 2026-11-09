import { createHmac, timingSafeEqual } from 'node:crypto';
import { StorageError } from '../storage/sqlite.js';
import { parseGitHubRepository } from './github-app.js';

const fail = (status, message) => { throw new StorageError(status, message); };
export class TeamInvites {
    constructor(store, app, secret) { this.store = store; this.app = app; this.secret = secret; }
    ready() {
        this.app.requireConfig();
        if (typeof this.secret !== 'string' || this.secret.length < 32) fail(503, 'Team invitation links are not enabled. Contact the organizer.');
    }
    signature(payload) { return createHmac('sha256', this.secret).update(payload).digest('base64url'); }
    issue(session, name) {
        const eventId = this.store.authorize(session, name);
        this.ready();
        const event = this.store.getEvent(name), connection = this.store.githubConnection(name);
        if (!connection || connection.account_type !== 'Organization' || connection.app_id !== String(this.app.config.githubAppId)) fail(400, 'Connect this event to its organization GitHub App first.');
        const expiresAt = this.store.now() + 30 * 86400000;
        const links = event.teams.map(team => {
            if (!team.github) return { teamId: team._id, name: team.name, error: 'No repository assigned' };
            const repository = parseGitHubRepository(team.github);
            if (repository.split('/')[0].toLowerCase() !== connection.account.toLowerCase()) return { teamId: team._id, name: team.name, error: 'Repository is outside the connected organization' };
            const payload = Buffer.from(JSON.stringify({ eventId, teamId: team._id, repository, installationId: connection.installation_id, expiresAt })).toString('base64url');
            return { teamId: team._id, name: team.name, repository, expiresAt,
                url: new URL('/join', this.app.config.githubAppBaseUrl).href + '#' + payload + '.' + this.signature(payload) };
        });
        return { expiresAt, links };
    }
    resolve(token) {
        this.ready();
        if (typeof token !== 'string' || token.length > 2000) fail(404, 'This team invitation link is invalid or expired.');
        const [payload, signature, extra] = token.split('.');
        const expected = this.signature(payload || '');
        if (extra || !signature || !/^[a-zA-Z0-9_-]+$/.test(signature) || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail(404, 'This team invitation link is invalid or expired.');
        let data;
        try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { fail(404, 'This team invitation link is invalid or expired.'); }
        if (!Number.isFinite(data.expiresAt) || data.expiresAt <= this.store.now()) fail(410, 'This team invitation link has expired. Ask the organizer for a new one.');
        const team = this.store.db.query('SELECT teams.id,teams.name,teams.github,events.name AS event FROM teams JOIN events ON events.id=teams.event_id WHERE teams.id=? AND teams.event_id=?').get(data.teamId, data.eventId);
        if (!team) fail(404, 'This team is no longer available.');
        const connection = this.store.githubConnection(team.event);
        if (!connection || connection.app_id !== String(this.app.config.githubAppId) || connection.installation_id !== data.installationId || connection.account_type !== 'Organization' || parseGitHubRepository(team.github) !== data.repository || data.repository.split('/')[0].toLowerCase() !== connection.account.toLowerCase()) fail(410, 'This team repository connection changed. Ask the organizer for a new link.');
        return { teamId: team.id, name: team.name, repository: data.repository, expiresAt: data.expiresAt, installationId: data.installationId };
    }
}

// Small bounded in-process admission: one web replica, no worker/database writes.
export class TeamInviteGate {
    constructor({ now = Date.now } = {}) { this.now = now; this.windows = new Map(); this.running = new Set(); }
    enter(teamId, username, network) {
        const now = this.now(), duration = 600000;
        for (const [key, entry] of this.windows) if (entry.until <= now) this.windows.delete(key);
        const requestKey = `${teamId}:${username.toLowerCase()}`;
        if (this.running.size >= 4 || this.running.has(requestKey)) fail(429, 'Another invitation is being processed. Wait a moment and retry.');
        const limits = [['global', 120], [`network:${network}`, 60], [`team:${teamId}`, 12], [`user:${requestKey}`, 2]];
        if (this.windows.size + limits.length > 2048 || limits.some(([key, limit]) => (this.windows.get(key)?.count || 0) >= limit)) fail(429, 'Too many invitation attempts. Wait up to ten minutes before retrying.');
        for (const [key] of limits) {
            const entry = this.windows.get(key) || { count: 0, until: now + duration };
            entry.count++; this.windows.set(key, entry);
        }
        this.running.add(requestKey);
        return () => this.running.delete(requestKey);
    }
}
