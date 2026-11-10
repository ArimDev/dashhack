import {getMentorNotifier} from '../utils/mentorNotifications.js';
export default defineNitroPlugin(nitro=>{
    const config=useRuntimeConfig();if(!config.discordBotToken?.trim()||!config.discordMentorChannelId)return;
    const tick=()=>getMentorNotifier().tick().catch(()=>console.warn('[Discord] Mentor notification check failed.'));
    const timer=setInterval(tick,15000);timer.unref?.();void tick();
    nitro.hooks.hook('close',()=>clearInterval(timer));
});
