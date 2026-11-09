import { TeamInvites } from '../../../services/team-invites.js';
export default apiHandler(async event => {
    const body=await teamInviteBody(event),session=getCookie(event,'session');
    const invites=new TeamInvites(getStore(),getGitHubApp(),useRuntimeConfig().githubTeamInviteSecret),context=teamInviteContext(event);
    if(body.action && body.action!=='issue') return {status:200,...invites.manage(session,body.event,body,context)};
    return {status:200,...invites.issue(session,body.event,body,context)};
});
