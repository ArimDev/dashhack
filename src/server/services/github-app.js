import { createHash, sign } from 'node:crypto';
import { StorageError } from '../storage/sqlite.js';
import { GITHUB_APP_VARIABLES } from '../../shared/githubAppSetup.js';

export function parseGitHubRepository(value) {
    let url;
    try { url = new URL(value); } catch { throw new StorageError(400, 'Invalid GitHub repository URL'); }
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password) throw new StorageError(400, 'Use an HTTPS github.com repository URL');
    const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (parts.length !== 2 || parts.some(part => !/^[A-Za-z0-9_.-]+$/.test(part))) throw new StorageError(400, 'Select the repository root URL');
    return `${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
}

export class GitHubAppService {
    constructor(config, { request = fetch, now = Date.now } = {}) {
        this.config = config; this.request = request; this.now = now;
        this.tokens = new Map();
    }
    get missingVariables() {
        return Object.entries(GITHUB_APP_VARIABLES).filter(([key]) => !String(this.config[key] ?? '').trim()).map(([, variable]) => variable);
    }
    get configured() { return this.missingVariables.length === 0; }
    requireConfig() {
        if (!this.configured) throw new StorageError(503, 'GitHub App is not configured on this server yet');
        if (!/^[a-z0-9-]+$/i.test(this.config.githubAppSlug)) throw new StorageError(503, 'Invalid GitHub App configuration');
        const base = new URL(this.config.githubAppBaseUrl);
        if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) throw new StorageError(503, 'GitHub App requires an HTTPS base URL');
    }
    get callbackUrl() { return new URL('/github/callback', this.config.githubAppBaseUrl).href; }
    get installUrl() { return `https://github.com/apps/${this.config.githubAppSlug}/installations/new`; }
    authorizeUrl(flow) {
        this.requireConfig();
        const url = new URL('https://github.com/login/oauth/authorize');
        url.search = new URLSearchParams({ client_id: this.config.githubAppClientId, redirect_uri: this.callbackUrl,
            state: flow.id, code_challenge: createHash('sha256').update(flow.verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
        return url.href;
    }
    jwt() {
        this.requireConfig();
        const now = Math.floor(this.now() / 1000);
        const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
        const payload = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: this.config.githubAppId })}`;
        try { return `${payload}.${sign('RSA-SHA256', Buffer.from(payload), this.config.githubAppPrivateKey.replace(/\\n/g, '\n')).toString('base64url')}`; }
        catch { throw new StorageError(503, 'GitHub App private key is invalid'); }
    }
    async api(path, token, { method = 'GET', body } = {}) {
        const response = await this.request(`https://api.github.com${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(15000),
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', ...(body ? { 'Content-Type': 'application/json' } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}) });
        if (!response.ok) throw new StorageError(response.status === 404 ? 404 : response.status === 401 || response.status === 403 ? 403 : 502,
            response.status === 401 || response.status === 403 ? 'GitHub access was denied or its API limit was reached. Check the App installation.' : 'GitHub request failed. Check repository access and try again.');
        return response.status === 204 ? null : response.json();
    }
    async exchange(code, verifier) {
        this.requireConfig();
        if (typeof code !== 'string' || !code || code.length > 1000) throw new StorageError(400, 'GitHub authorization was cancelled or is invalid');
        const response = await this.request('https://github.com/login/oauth/access_token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: this.config.githubAppClientId,
                client_secret: this.config.githubAppClientSecret, code, redirect_uri: this.callbackUrl, code_verifier: verifier }) });
        const data = await response.json();
        if (!response.ok || !data.access_token || data.error) throw new StorageError(400, 'GitHub authorization expired. Connect again.');
        return data.access_token;
    }
    async eligibleInstallations(userToken) {
        const user = await this.api('/user', userToken);
        const choices = [];
        for (let page = 1; page <= 10; page++) {
            const data = await this.api(`/user/installations?per_page=100&page=${page}`, userToken);
            for (const installation of data.installations || []) {
                if (String(installation.app_id) !== String(this.config.githubAppId) || installation.suspended_at || !['read', 'write'].includes(installation.permissions?.contents)) continue;
                const account = installation.account;
                // An ordinary collaborator must not grant an event the whole installation's access.
                let owner = account.type === 'User' && account.id === user.id;
                if (account.type === 'Organization') {
                    try {
                        const membership = await this.api(`/user/memberships/orgs/${encodeURIComponent(account.login)}`, userToken);
                        owner = membership.state === 'active' && membership.role === 'admin';
                    } catch (error) { if (![403, 404].includes(error.status)) throw error; }
                }
                if (owner) choices.push({ id: installation.id, account: account.login, type: account.type });
            }
            if ((data.installations || []).length < 100) return choices;
        }
        throw new StorageError(400, 'Too many GitHub installations to list. Contact the organizer.');
    }
    async installationToken(id) {
        this.requireConfig();
        if (!Number.isSafeInteger(id) || id <= 0) throw new StorageError(400, 'Invalid installation');
        const cached = this.tokens.get(id);
        if (cached && cached.expires > this.now() + 60000) return cached.promise;
        if (this.tokens.size >= 16) this.tokens.delete(this.tokens.keys().next().value);
        const entry = { expires: Infinity, promise: null };
        entry.promise = this.api(`/app/installations/${id}/access_tokens`, this.jwt(), { method: 'POST', body: { permissions: { contents: 'read', metadata: 'read' } } })
            .then(data => {
                if (!data.token || !Number.isFinite(Date.parse(data.expires_at))) throw new StorageError(502, 'GitHub returned an invalid installation token');
                entry.expires = Date.parse(data.expires_at); return data.token;
            }).catch(error => { if (this.tokens.get(id) === entry) this.tokens.delete(id); throw error; });
        this.tokens.set(id, entry);
        return entry.promise;
    }
    async inviteCollaborator(id, repository, username) {
        this.requireConfig();
        if (typeof username !== 'string' || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new StorageError(400, 'Enter your GitHub username, without @ or a URL.');
        repository = parseGitHubRepository('https://github.com/' + repository);
        const readToken = await this.installationToken(id);
        const repo = await this.api(`/repos/${repository}`, readToken);
        let user;
        try { user = await this.api(`/users/${encodeURIComponent(username)}`, readToken); }
        catch (error) { if (error.status === 404) throw new StorageError(400, 'GitHub username not found. Check the spelling.'); throw error; }
        if (user.type !== 'User' || !/^[a-z\d-]{1,39}$/i.test(user.login)) throw new StorageError(400, 'Use a personal GitHub account.');
        const invitationUrl = `https://github.com/${repository}/invitations`;
        try {
            const access = await this.api(`/repos/${repository}/collaborators/${user.login}/permission`, readToken);
            if (['admin', 'write', 'maintain', 'push'].includes(access.permission)) return { username: user.login, alreadyHasAccess: true, invitationUrl, repositoryUrl: `https://github.com/${repository}` };
        } catch (error) { if (error.status !== 404) throw error; }
        const installation = await this.api(`/app/installations/${id}`, this.jwt());
        if (installation.suspended_at || installation.permissions?.administration !== 'write') throw new StorageError(503, 'The organizer must approve Administration: Read and write on the installed GitHub App before invitations can be sent.');
        if (!Number.isSafeInteger(repo.id)) throw new StorageError(502, 'GitHub returned an invalid repository.');
        // Mint an uncached administration token for ONLY this repository; chart/picker tokens stay read-only.
        const grant = await this.api(`/app/installations/${id}/access_tokens`, this.jwt(), { method: 'POST', body: {
            repository_ids: [repo.id], permissions: { administration: 'write', metadata: 'read' },
        } });
        if (!grant.token) throw new StorageError(502, 'GitHub could not authorize this invitation.');
        let alreadyHasAccess = false;
        try {
            alreadyHasAccess = (await this.api(`/repos/${repository}/collaborators/${user.login}`, grant.token, { method: 'PUT', body: { permission: 'push' } })) === null;
        } finally {
            // Revoke the short-lived privileged token immediately after use. It is never cached or persisted.
            try { await this.api('/installation/token', grant.token, { method: 'DELETE' }); } catch { /* It still expires at GitHub's normal one-hour limit. */ }
        }
        return { username: user.login, alreadyHasAccess, invitationUrl, repositoryUrl: `https://github.com/${repository}` };
    }
    async repositories(id, page = 1) {
        if (!Number.isInteger(page) || page < 1 || page > 100) throw new StorageError(400, 'Invalid repository page');
        const token = await this.installationToken(id);
        const data = await this.api(`/installation/repositories?per_page=100&page=${page}`, token);
        return { total: data.total_count, repositories: data.repositories.map(repo => ({ id: repo.id, name: repo.full_name,
            url: `https://github.com/${repo.full_name}`, private: !!repo.private })), hasMore: page * 100 < data.total_count };
    }
}
