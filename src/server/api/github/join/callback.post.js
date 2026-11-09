import { TeamInvites, TeamInviteGate } from '../../../services/team-invites.js';
const gate=new TeamInviteGate();
export default apiHandler(async event=>{
    const context=teamInviteContext(event),invites=new TeamInvites(getStore(),getGitHubApp(),useRuntimeConfig().githubTeamInviteSecret);
    setHeader(event,'X-Request-ID',context.requestId);
    let release;
    try {
        release=gate.enter('callback',context.ip,context.ip);
        const {state,code}=await teamInviteBody(event);
        return {status:200,...await invites.verify(state,getCookie(event,'github_student_browser'),code,context)};
    } catch(error) {
        if(error.status===429) setHeader(event,'Retry-After','600');
        invites.audit(context,'oauth_callback','denied_'+(error.status || 500));throw error;
    } finally {release?.();}
});
