import {verifyDiscordSignature,discordInteraction} from '../../services/discord.js';
import {StorageError} from '../../storage/sqlite.js';
export default defineEventHandler(async event=>{
    discordPrivateHeaders(event);
    try{
        const {raw,body}=await discordBody(event),store=getDiscordStore(),config=store.settingsByApp(body.application_id);
        if(!config||!verifyDiscordSignature(raw,getHeader(event,'x-signature-ed25519'),getHeader(event,'x-signature-timestamp'),config.public_key,store.now())){setResponseStatus(event,401);return {error:'Invalid signature'};}
        return discordInteraction(body,store,discordBaseUrl(event));
    }catch(error){setResponseStatus(event,error instanceof StorageError?error.status:500);return {error:error instanceof StorageError?error.message:'Discord request failed'};}
});
