export const GITHUB_EVENT_ORGANIZATION = 'AT-T-Hackathon-Junior-2026';
export const GITHUB_APP_VARIABLES = Object.freeze({
    githubAppId: 'NUXT_GITHUB_APP_ID',
    githubAppClientId: 'NUXT_GITHUB_APP_CLIENT_ID',
    githubAppClientSecret: 'NUXT_GITHUB_APP_CLIENT_SECRET',
    githubAppPrivateKey: 'NUXT_GITHUB_APP_PRIVATE_KEY',
    githubAppSlug: 'NUXT_GITHUB_APP_SLUG',
    githubAppBaseUrl: 'NUXT_GITHUB_APP_BASE_URL',
});

export function githubAppRegistration(baseUrl) {
    const base = new URL(baseUrl);
    if (base.username || base.password || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname)))) {
        throw new Error('Use an HTTPS app URL or localhost for development');
    }
    const callbackUrl = new URL('/github/callback', base.origin).href;
    const url = new URL(`https://github.com/organizations/${GITHUB_EVENT_ORGANIZATION}/settings/apps/new`);
    url.search = new URLSearchParams({ name: 'Hackathon Junior 2026 DashHack',
        description: 'Read-only repository activity for AT&T Hackathon Junior 2026.',
        url: base.origin, request_oauth_on_install: 'false', public: 'false', webhook_active: 'false',
        contents: 'read', metadata: 'read', members: 'read' }).toString();
    url.searchParams.append('callback_urls[]', callbackUrl);
    if (base.origin !== 'http://localhost:5002') url.searchParams.append('callback_urls[]', 'http://localhost:5002/github/callback');
    return { registrationUrl: url.href, callbackUrl, baseUrl: base.origin };
}
