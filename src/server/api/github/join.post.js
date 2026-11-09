import { randomBytes } from 'node:crypto';
import { StorageError } from '../../storage/sqlite.js';
import { TeamInvites, TeamInviteGate } from '../../services/team-invites.js';
const gate=new TeamInviteGate();
export default apiHandler(async event=>{
    const context=teamInviteContext(event),config=useRuntimeConfig(),app=getGitHubApp(),invites=new TeamInvites(getStore(),app,config.githubTeamInviteSecret);
    setHeader(event,'X-Request-ID',context.requestId);
    let release,team;
    try {
        release=gate.enter('network',context.ip,context.ip);
        const body=await teamInviteBody(event);
        if(body.action==='invite') {
            // The supplied username is never read: only GitHub's verified /user identity is used.
            const result=await invites.claim(body.claimId,getCookie(event,'github_student_browser'),context);
            return {status:200,...result};
        }
        team=invites.resolve(body.token);
        if(body.action==='preview') {invites.audit({...context,...team},'preview','allowed');return {status:200,team:{name:team.name,repository:team.repository,expiresAt:team.expiresAt}};}
        if(body.action!=='start') throw new StorageError(400,'Invalid invitation action.');
        const browser=randomBytes(32).toString('base64url'),flow=invites.begin(body.token,browser,context);
        setCookie(event,'github_student_browser',browser,{httpOnly:true,secure:!import.meta.dev,sameSite:'lax',path:'/',maxAge:600});
        const url=new URL(app.authorizeUrl(flow));url.searchParams.set('prompt','select_account');
        return {status:200,url:url.href};
    } catch(error) {
        if(error.status===429) setHeader(event,'Retry-After','600');
        invites.audit({...context,...(team || {})},'request','denied_'+(error.status || 500));
        console.info(JSON.stringify({type:'team_invite',requestId:context.requestId,linkId:team?.linkId || '',outcome:'denied',status:error.status || 500}));
        throw error;
    } finally {release?.();}
});
