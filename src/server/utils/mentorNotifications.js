import {MentorNotifier} from '../services/mentor-notifications.js';
let notifier;
export function getMentorNotifier(){
    if(!notifier){const config=useRuntimeConfig();notifier=new MentorNotifier(getStore(),{token:config.discordBotToken,channelId:config.discordMentorChannelId,roleId:config.discordMentorRoleId,baseUrl:config.githubAppBaseUrl||(process.env.RAILWAY_PUBLIC_DOMAIN?'https://'+process.env.RAILWAY_PUBLIC_DOMAIN:'')});}
    return notifier;
}
export function queueMentorDelivery(event){
    try{
        const promise=getMentorNotifier().tick().catch(()=>console.warn('[Discord] Mentor notification check failed.'));
        if(event.waitUntil)event.waitUntil(promise);
    }catch{console.warn('[Discord] Mentor notification could not start.');}
}
export function mentorNotificationStatus(eventId){
    const config=useRuntimeConfig(),db=getStore().db;
    return {tokenConfigured:!!config.discordBotToken?.trim(),channelId:config.discordMentorChannelId||'',roleId:config.discordMentorRoleId||'',counts:db.query('SELECT state,COUNT(*) count FROM discord_notifications WHERE event_id=? GROUP BY state').all(eventId),lastError:db.query("SELECT last_error FROM discord_notifications WHERE event_id=? AND last_error<>'' ORDER BY created_at DESC LIMIT 1").get(eventId)?.last_error||''};
}
