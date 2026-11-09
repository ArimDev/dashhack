import { isIP } from 'node:net';
import { StorageError } from '../../storage/sqlite.js';
import { TeamInvites, TeamInviteGate } from '../../services/team-invites.js';
import { readWallNodeBody, stopWallBody } from '../../services/wall-body.js';
const gate = new TeamInviteGate();
export default apiHandler(async event => {
    setHeader(event, 'Cache-Control', 'no-store');
    setHeader(event, 'Referrer-Policy', 'no-referrer');
    const config = useRuntimeConfig(), origin = getHeader(event, 'origin');
    if (!config.githubAppBaseUrl) throw new StorageError(503, 'Team invitation links are not enabled.');
    if (origin && origin !== new URL(config.githubAppBaseUrl).origin) throw new StorageError(403, 'Open the team link directly in DashHack.');
    if (!(getHeader(event, 'content-type') || '').startsWith('application/json')) throw new StorageError(415, 'Expected a JSON request.');
    if (Number(getHeader(event, 'content-length')) > 4096) { stopWallBody(event.node.req, event.node.res); throw new StorageError(413, 'Request is too large.'); }
    let body;
    try { body = JSON.parse((await readWallNodeBody(event.node.req, event.node.res, { limit: 4096, timeoutMs: 10000 })).toString()); }
    catch (error) { throw new StorageError(error.status || 400, 'Could not read invitation request. Open the link again and retry.'); }
    const app = getGitHubApp(), invites = new TeamInvites(getStore(), app, config.githubTeamInviteSecret);
    const team = invites.resolve(body?.token);
    if (body.action === 'preview') return { status: 200, team: { name: team.name, repository: team.repository, expiresAt: team.expiresAt } };
    if (body.action !== 'invite') throw new StorageError(400, 'Invalid invitation action.');
    const username = typeof body.username === 'string' ? body.username.trim().replace(/^@/, '') : '';
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new StorageError(400, 'Enter your GitHub username, without a URL.');
    const edgeIP = process.env.RAILWAY_ENVIRONMENT_ID && getHeader(event, 'x-real-ip');
    const network = edgeIP && isIP(edgeIP) ? edgeIP : getRequestIP(event) || 'unknown';
    let release;
    try { release = gate.enter(team.teamId, username, network); }
    catch (error) { if (error.status === 429) setHeader(event, 'Retry-After', '600'); throw error; }
    try { return { status: 200, ...await app.inviteCollaborator(team.installationId, team.repository, username) }; }
    finally { release(); }
});
