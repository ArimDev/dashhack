import {createPublicKey,verify} from 'node:crypto';
import {StorageError} from '../storage/sqlite.js';
export const DISCORD_COMMANDS=[
    {name:'mentor',description:'Požádat mentora o pomoc',type:1,options:[{name:'urgent',description:'Požadavek má vysokou prioritu',type:5,required:false}]},
    {name:'matice',description:'Otevřít startupovou matici svého týmu',type:1},
];
export function verifyDiscordSignature(raw,signature,timestamp,publicKey,now=Date.now()){
    if(typeof signature!=='string'||!/^[a-f0-9]{128}$/i.test(signature)||typeof timestamp!=='string'||!/^\d{10,12}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>300000||!/^[a-f0-9]{64}$/i.test(publicKey||''))return false;
    try{const key=createPublicKey({key:Buffer.from('302a300506032b6570032100'+publicKey,'hex'),format:'der',type:'spki'});return verify(null,Buffer.concat([Buffer.from(timestamp),Buffer.from(raw)]),key,Buffer.from(signature,'hex'));}catch{return false;}
}
const reply=(content,components)=>({type:4,data:{content,flags:64,allowed_mentions:{parse:[]},...(components?{components}: {})}});
function textInputs(nodes,result=[]){for(const node of nodes||[]){if(node.type===4&&node.custom_id==='request')result.push(node.value);if(node.components)textInputs(node.components,result);if(node.component)textInputs([node.component],result);}return result;}
export function discordInteraction(payload,store,baseUrl){
    if(payload.type===1)return {type:1};
    try{
        const ctx=store.context(payload);
        if(payload.type===2&&payload.data?.name==='mentor'){
            const urgent=payload.data.options?.some(option=>option.name==='urgent'&&option.value===true);
            return {type:9,data:{custom_id:urgent?'dashhack-mentor-high':'dashhack-mentor-medium',title:'Požádat mentora o pomoc',components:[{type:18,label:'S čím potřebujete pomoci?',component:{type:4,custom_id:'request',style:2,required:true,max_length:4000}}]}};
        }
        if(payload.type===5&&/^dashhack-mentor-(medium|high)$/.test(payload.data?.custom_id||'')){
            const values=textInputs(payload.data.components);if(values.length!==1)throw new StorageError(400,'Vyplňte požadavek.');
            store.help(payload,values[0],payload.data.custom_id.endsWith('high')?'high':'medium');
            return reply('Požadavek byl přidán do Kanbanu.');
        }
        if(payload.type===2&&payload.data?.name==='matice'){
            const link=store.matrixLink(payload);
            return reply(`Startupová matice: ${ctx.team.name}`,[{type:1,components:[{type:2,style:5,label:'Otevřít matici',url:`${baseUrl}/discord/matrix#${link.id}.${link.token}`}]}]);
        }
        return reply('Neznámý příkaz.');
    }catch(error){if(error instanceof StorageError)return reply(error.message);throw error;}
}
export async function registerDiscordCommands(config,token,request=fetch){
    if(typeof token!=='string'||!token.trim()||token.length>300)throw new StorageError(400,'Vložte token bota z nastavení aplikace Discord.');
    for(const command of DISCORD_COMMANDS){
        const response=await request(`https://discord.com/api/v10/applications/${config.applicationId}/guilds/${config.guildId}/commands`,{method:'POST',headers:{Authorization:`Bot ${token.trim()}`,'Content-Type':'application/json'},body:JSON.stringify(command),redirect:'error',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new StorageError(response.status===429?429:400,response.status===429?'Discord omezuje počet změn. Zkuste to později.':'Registrace se nezdařila. Ověřte token a instalaci aplikace do serveru.');
    }
}
