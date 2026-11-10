import {createPublicKey,verify} from 'node:crypto';
import {StorageError} from '../storage/sqlite.js';
export const DISCORD_COMMANDS=[
    {name:'mentor',description:'Požádat mentora o pomoc',type:1,options:[]},
    {name:'help',description:'Požádat mentora o pomoc',type:1,options:[]},
    {name:'matice',description:'Otevřít startupovou matici svého týmu',type:1},
    {name:'github',description:'Přihlásit se k GitHub repozitáři svého týmu',type:1},
];
export function verifyDiscordSignature(raw,signature,timestamp,publicKey,now=Date.now()){
    if(typeof signature!=='string'||!/^[a-f0-9]{128}$/i.test(signature)||typeof timestamp!=='string'||!/^\d{10,12}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>300000||!/^[a-f0-9]{64}$/i.test(publicKey||''))return false;
    try{const key=createPublicKey({key:Buffer.from('302a300506032b6570032100'+publicKey,'hex'),format:'der',type:'spki'});return verify(null,Buffer.concat([Buffer.from(timestamp),Buffer.from(raw)]),key,Buffer.from(signature,'hex'));}catch{return false;}
}
const reply=(content,components)=>({type:4,data:{content,flags:64,allowed_mentions:{parse:[]},...(components?{components}: {})}});
function inputs(nodes,type,id,result=[]){for(const node of nodes||[]){if(node.type===type&&node.custom_id===id)result.push(node);if(node.components)inputs(node.components,type,id,result);if(node.component)inputs([node.component],type,id,result);}return result;}
export function discordInteraction(payload,store,baseUrl,{githubInvites,mentorControls}={}){
    if(payload.type===1)return {type:1};
    try{
        if(payload.type===3&&payload.data?.custom_id?.startsWith('dh-status:')){
            store.mentorStatus(payload,mentorControls);
            return {type:6};
        }
        const ctx=store.context(payload);
        if(payload.type===2&&['mentor','help'].includes(payload.data?.name)){
            const urgent=payload.data.options?.some(option=>option.name==='urgent'&&option.value===true);
            return {type:9,data:{custom_id:'dashhack-mentor',title:'Požádat mentora o pomoc',components:[
                {type:18,label:'S čím potřebujete pomoci?',component:{type:4,custom_id:'request',style:2,required:true,max_length:4000}},
                {type:18,label:'Naléhavost',component:{type:3,custom_id:'urgency',min_values:1,max_values:1,required:true,options:[
                    {label:'Běžná',value:'medium',default:!urgent},
                    {label:'Naléhavá',value:'high',default:!!urgent},
                ]}},
            ]}};
        }
        if(payload.type===5&&/^dashhack-mentor(?:-(medium|high))?$/.test(payload.data?.custom_id||'')){
            const values=inputs(payload.data.components,4,'request');if(values.length!==1)throw new StorageError(400,'Vyplňte požadavek.');
            let priority=payload.data.custom_id.endsWith('high')?'high':'medium';
            if(payload.data.custom_id==='dashhack-mentor'){
                const selected=inputs(payload.data.components,3,'urgency');
                if(selected.length!==1||!Array.isArray(selected[0].values)||selected[0].values.length!==1||!['medium','high'].includes(selected[0].values[0]))throw new StorageError(400,'Vyberte naléhavost požadavku.');
                priority=selected[0].values[0];
            }
            store.help(payload,values[0].value,priority);
            return reply('Požadavek byl přidán do Kanbanu.');
        }
        if(payload.type===2&&payload.data?.name==='github'){
            const link=store.githubLink(payload,githubInvites);
            return reply(`GitHub: ${link.teamName}`,[{type:1,components:[{type:2,style:5,label:'Přihlásit se přes GitHub',url:link.url}]}]);
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
