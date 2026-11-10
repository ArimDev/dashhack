import {registerDiscordCommands} from '../../services/discord.js';
export default apiHandler(async event=>{
    discordPrivateHeaders(event);discordSameOrigin(event);const {body}=await discordBody(event,16384);
    const owner=getDiscordStore().owner(getCookie(event,'session'),body.event);
    if(!owner.configured)return {status:400,message:'Nejprve uložte nastavení aplikace.'};
    try{await registerDiscordCommands(owner.config,body.token);}catch(error){if(error.status)throw error;return {status:502,message:'Discord není dostupný. Zkuste to později.'};}
    return {status:200,message:'Příkazy /mentor a /matice jsou zaregistrované.'};
});
