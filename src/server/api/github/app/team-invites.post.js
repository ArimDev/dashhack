import { TeamInvites } from '../../../services/team-invites.js';
export default apiHandler(async event => {
    setHeader(event, 'Cache-Control', 'no-store');
    const { event: name } = await readBody(event);
    return { status: 200, ...new TeamInvites(getStore(), getGitHubApp(), useRuntimeConfig().githubTeamInviteSecret).issue(getCookie(event, 'session'), name) };
});
