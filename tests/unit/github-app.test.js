import { describe, test, expect } from 'bun:test';
import { generateKeyPairSync, verify, createHash } from 'node:crypto';
import { GitHubAppService, parseGitHubRepository } from '../../src/server/services/github-app.js';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const config = { githubAppId: '42', githubAppClientId: 'client', githubAppClientSecret: 'secret',
    githubAppPrivateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }), githubAppSlug: 'dashhack-test', githubAppBaseUrl: 'http://localhost:5002' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

describe('GitHub App', () => {
    test('JWT is signed, short-lived, and OAuth binds the exact callback with PKCE', () => {
        const now = 1800000000000;
        const app = new GitHubAppService(config, { now: () => now });
        const [header, payload, signature] = app.jwt().split('.');
        expect(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
        const claims = JSON.parse(Buffer.from(payload, 'base64url'));
        expect(claims.iss).toBe('42'); expect(claims.iat).toBe(now / 1000 - 60); expect(claims.exp).toBe(now / 1000 + 540);
        const url = new URL(app.authorizeUrl({ id: 'state', verifier: 'verifier' }));
        expect(url.origin).toBe('https://github.com');
        expect(url.searchParams.get('code_challenge')).toBe(createHash('sha256').update('verifier').digest('base64url'));
        expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5002/github/callback');
        expect(url.searchParams.has('client_secret')).toBe(false);
    });

    test('only personal account owners or active organization owners may share installations', async () => {
        const installations = [
            { id: 1, app_id: 42, permissions: { contents: 'read' }, account: { id: 7, login: 'me', type: 'User' } },
            { id: 2, app_id: 42, permissions: { contents: 'read' }, account: { id: 8, login: 'other', type: 'User' } },
            ...['owned-org', 'member-org', 'pending-org'].map((login, i) => ({ id: i + 3, app_id: 42, permissions: { contents: 'read' }, account: { login, type: 'Organization' } })),
            { id: 9, app_id: 99, permissions: { contents: 'read' }, account: { id: 7, login: 'me', type: 'User' } },
        ];
        const app = new GitHubAppService(config, { request: async url => {
            const path = new URL(url).pathname;
            if (path === '/user') return json({ id: 7 });
            if (path === '/user/installations') return json({ installations });
            if (path.endsWith('owned-org')) return json({ role: 'admin', state: 'active' });
            if (path.endsWith('member-org')) return json({ role: 'member', state: 'active' });
            if (path.endsWith('pending-org')) return json({ role: 'admin', state: 'pending' });
            throw Error('Unexpected request');
        } });
        expect(await app.eligibleInstallations('user-token')).toEqual([{ id: 1, account: 'me', type: 'User' }, { id: 3, account: 'owned-org', type: 'Organization' }]);
    });

    test('installation tokens are read-only, coalesced, refreshed before expiry and never written to storage', async () => {
        let now = 1800000000000, minted = 0;
        const app = new GitHubAppService(config, { now: () => now, request: async (url, options) => {
            expect(url).toBe('https://api.github.com/app/installations/10/access_tokens');
            expect(JSON.parse(options.body).permissions).toEqual({ contents: 'read', metadata: 'read' });
            minted++;
            return json({ token: `installation-${minted}`, expires_at: new Date(now + 3600000).toISOString() });
        } });
        expect(await Promise.all([app.installationToken(10), app.installationToken(10)])).toEqual(['installation-1', 'installation-1']);
        expect(minted).toBe(1);
        now += 3550000;
        expect(await app.installationToken(10)).toBe('installation-2');
        expect(minted).toBe(2);
    });

    test('failed token requests are retryable and errors do not contain credentials', async () => {
        let attempts = 0;
        const app = new GitHubAppService(config, { request: async () => ++attempts === 1 ? json({ message: 'private secret details' }, 403) : json({ token: 'ok', expires_at: new Date(Date.now() + 3600000).toISOString() }) });
        await expect(app.installationToken(1)).rejects.toThrow('GitHub access was denied');
        expect(await app.installationToken(1)).toBe('ok');
        expect(new GitHubAppService({}).configured).toBe(false);
    });

    test('code exchange sends PKCE only to GitHub, repo results omit token-bearing GitHub metadata', async () => {
        const app = new GitHubAppService(config, { request: async (url, options) => {
            if (url.includes('/login/oauth/access_token')) {
                expect(JSON.parse(options.body)).toMatchObject({ client_secret: 'secret', code: 'code', code_verifier: 'verifier', redirect_uri: 'http://localhost:5002/github/callback' });
                return json({ access_token: 'user-token' });
            }
            if (url.includes('/access_tokens')) return json({ token: 'installation', expires_at: new Date(Date.now() + 3600000).toISOString() });
            expect(url).toContain('page=2');
            return json({ total_count: 101, repositories: [{ id: 1, full_name: 'school/team-15', private: true, temp_clone_token: 'never-expose' }] });
        } });
        expect(await app.exchange('code', 'verifier')).toBe('user-token');
        expect(await app.repositories(10, 2)).toEqual({ total: 101, hasMore: false, repositories: [{ id: 1, name: 'school/team-15', private: true, url: 'https://github.com/school/team-15' }] });
    });

    test('repository parsing never allows arbitrary hosts, credentials or injected API paths', () => {
        expect(parseGitHubRepository('https://github.com/school/team.git')).toBe('school/team');
        for (const url of ['https://github.com.evil.test/school/team', 'https://token@github.com/school/team', 'http://github.com/school/team', 'https://github.com/school/team/issues', 'https://github.com/school/a%2fb']) expect(() => parseGitHubRepository(url)).toThrow();
    });
});

describe('GitHub App setup', () => {
    test('configuration diagnostics contain only missing variable names', () => {
        const app = new GitHubAppService({ ...config, githubAppClientSecret: '  ', githubAppPrivateKey: '' });
        expect(app.configured).toBe(false);
        expect(app.missingVariables).toEqual(['NUXT_GITHUB_APP_CLIENT_SECRET', 'NUXT_GITHUB_APP_PRIVATE_KEY']);
        expect(new GitHubAppService(config).missingVariables).toEqual([]);
    });
    test('registration targets the event organization with read-only grants and exact callbacks', async () => {
        const { githubAppRegistration } = await import('../../src/shared/githubAppSetup.js');
        const setup = githubAppRegistration('https://dashhack-production.up.railway.app/app/event/settings');
        const url = new URL(setup.registrationUrl);
        expect(url.origin + url.pathname).toBe('https://github.com/organizations/AT-T-Hackathon-Junior-2026/settings/apps/new');
        for (const permission of ['contents', 'metadata', 'members']) expect(url.searchParams.get(permission)).toBe('read');
        for (const flag of ['public', 'webhook_active', 'request_oauth_on_install']) expect(url.searchParams.get(flag)).toBe('false');
        expect(url.searchParams.getAll('callback_urls[]')).toEqual(['https://dashhack-production.up.railway.app/github/callback', 'http://localhost:5002/github/callback']);
        expect(setup.baseUrl).toBe('https://dashhack-production.up.railway.app');
        expect(githubAppRegistration('http://localhost:5002').callbackUrl).toBe('http://localhost:5002/github/callback');
        for (const base of ['http://example.com', 'javascript:alert(1)', 'https://user:secret@example.com']) expect(() => githubAppRegistration(base)).toThrow();
    });
});
