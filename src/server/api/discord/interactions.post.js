import {queueMentorDelivery} from '../../utils/mentorNotifications.js';
import {verifyDiscordSignature,discordInteraction} from '../../services/discord.js';
import {TeamInvites} from '../../services/team-invites.js';
import {StorageError} from '../../storage/sqlite.js';
export default defineEventHandler(async event=>{
    discordPrivateHeaders(event);
    try{
        const {raw,body}=await discordBody(event),store=getDiscordStore(),config=store.settingsByApp(body.application_id);
        if(!config||!verifyDiscordSignature(raw,getHeader(event,'x-signature-ed25519'),getHeader(event,'x-signature-timestamp'),config.public_key,store.now())){setResponseStatus(event,401);return {error:'Invalid signature'};}
        const githubInvites=body.type===2&&body.data?.name==='github'?new TeamInvites(getStore(),getGitHubApp(),useRuntimeConfig().githubTeamInviteSecret):undefined;
        const response=discordInteraction(body,store,discordBaseUrl(event),{githubInvites});
        if(body.type===5)queueMentorDelivery(event);
        return response;
    }catch(error){setResponseStatus(event,error instanceof StorageError?error.status:500);return {error:error instanceof StorageError?error.message:'Discord request failed'};}
});
