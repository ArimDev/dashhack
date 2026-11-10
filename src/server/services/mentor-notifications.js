import {createHash} from 'node:crypto';
const snowflake=value=>typeof value==='string'&&/^\d{17,20}$/.test(value);
const clean=value=>String(value||'').replace(/\r/g,'').replace(/@/g,'@\u200b').replace(/</g,'‹').replace(/([\\*_~`|\[\]])/g,'\\$1');
const clip=(value,limit)=>{let text='';for(const char of value){if(text.length+char.length>limit)break;text+=char;}return text;};
export const MENTOR_STATUSES={todo:'To Do',progress:'In Progress',done:'Done'};
export function mentorMessage(row,baseUrl,roleId){
    const url=new URL(`/app/${encodeURIComponent(row.event_name)}/kanban`,baseUrl);url.searchParams.set('note',row.note_id);
    const urgent=['high','critical'].includes(row.priority),labels={low:'Nízká',medium:'Běžná',high:'Naléhavá',critical:'Kritická'};
    const color=row.priority==='critical'?0xdc2626:urgent?0xf59e0b:/^#[a-f0-9]{6}$/i.test(row.team_color)?parseInt(row.team_color.slice(1),16):0x3081e0;
    const active=!!row.content&&row.type!=='mentor_note'&&row.in_kanban!==0;
    const description=clean((row.content||'Požadavek byl odstraněn.').replace(/\n\nDiscord: [^\n]*$/,''));
    return {...(snowflake(roleId)?{content:`<@&${roleId}>`}:{}),allowed_mentions:{parse:[],...(snowflake(roleId)?{roles:[roleId]}:{})},nonce:createHash('sha256').update(row.note_id).digest('hex').slice(0,24),enforce_nonce:true,
        embeds:[{title:clip(`${urgent?'🚨':'🙋'} ${clean(row.team_name)} · Žádost o pomoc`,256),url:url.href,color,
            description:clip(description,1500)+(Array.from(description).length>1500?'…':''),
            fields:[{name:'Priorita',value:labels[row.priority]||'Běžná',inline:true},{name:'Stav',value:active?(clean(row.status)||'To Do'):'Neaktivní',inline:true},
                {name:'Vytvořil/a',value:clip(clean(row.author||row.mentor_name||'Pořadatel'),100),inline:true}],
            footer:{text:'DashHack · Žádost o pomoc'},timestamp:new Date(row.created_at).toISOString()}],
        components:[{type:1,components:[{type:2,style:5,label:'Otevřít v Kanbanu',url:url.href}]},
            {type:1,components:Object.entries(MENTOR_STATUSES).map(([key,status])=>({type:2,style:status==='Done'?3:2,
                label:{todo:'K vyřízení',progress:'Řeší se',done:'Hotovo'}[key],
                custom_id:`dh-status:${row.note_id}:${Object.keys(MENTOR_STATUSES).find(key=>MENTOR_STATUSES[key]===row.status)||'todo'}:${key}`,
                disabled:!active||row.status===status}))}]};
}
export function mentorEdit(row,baseUrl){
    const {nonce,enforce_nonce,...message}=mentorMessage(row,baseUrl);
    return {...message,content:'',allowed_mentions:{parse:[]}};
}
const digest=message=>createHash('sha256').update(JSON.stringify(message)).digest('hex');
const selectCards=`SELECT q.*,n.content,n.priority,n.status,n.type,n.in_kanban,t.name team_name,t.color team_color,e.name event_name,m.name mentor_name,s.application_id,s.guild_id,s.enabled
    FROM discord_notifications q JOIN teams t ON t.id=q.team_id JOIN events e ON e.id=q.event_id
    LEFT JOIN notes n ON n.id=q.note_id AND n.team_id=q.team_id LEFT JOIN mentors m ON m.id=n.creator_id
    JOIN discord_settings s ON s.event_id=q.event_id`;
export class MentorNotifier{
    constructor(store,{token,channelId,roleId='',baseUrl,request=fetch}={}){this.store=store;this.db=store.db;this.token=token?.trim();this.channelId=channelId;this.roleId=roleId;this.baseUrl=baseUrl;this.request=request;this.running=false;this.verified=null;this.checkAfter=0;this.blockedUntil=0;}
    get configured(){return !!this.token&&snowflake(this.channelId)&&(!this.roleId||snowflake(this.roleId))&&/^https?:\/\//.test(this.baseUrl||'');}
    async api(path,options={}){return this.request('https://discord.com/api/v10'+path,{...options,headers:{Authorization:'Bot '+this.token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});}
    async target(){
        if(this.verified&&this.checkAfter>this.store.now())return this.verified;
        const [app,channel]=await Promise.all([this.api('/oauth2/applications/@me'),this.api('/channels/'+this.channelId)]);
        if(!app.ok||!channel.ok)throw new Error('Ověření bota/kanálu selhalo. Zkontrolujte token a oprávnění kanálu.');
        const a=await app.json(),c=await channel.json();
        if(!snowflake(a.id)||!snowflake(c.guild_id)||c.id!==this.channelId||![0,5].includes(c.type))throw new Error('Oznámení vyžadují textový kanál ve správném serveru.');
        if(this.roleId){
            const response=await this.api('/guilds/'+c.guild_id+'/roles');
            if(!response.ok)throw new Error('Nelze ověřit roli mentorů.');
            const roles=await response.json(),role=roles.find(role=>role.id===this.roleId&&role.id!==c.guild_id);
            if(!role?.mentionable)throw new Error('Role mentorů musí patřit tomuto serveru a být zmínitelná.');
        }
        this.verified={appId:a.id,guildId:c.guild_id};this.checkAfter=this.store.now()+300000;return this.verified;
    }
    finish(id,state,error='',messageId=''){this.db.query('UPDATE discord_notifications SET state=?,last_error=?,message_id=? WHERE note_id=?').run(state,error,messageId,id);}
    async sync(){
        const now=this.store.now();
        // Stream existing cards rather than retaining thousands of note bodies in memory.
        const dirty=[];
        for(const row of this.db.query(selectCards+" WHERE q.state='sent' AND s.enabled=1 AND (q.channel_id='' OR q.channel_id=?)").iterate(this.channelId)){
            const message=mentorEdit(row,this.baseUrl),hash=digest(message);
            if(hash!==row.sync_hash&&(hash!==row.sync_target||(row.sync_attempts<3&&row.sync_after<=now)))dirty.push({row,message,hash});
            if(dirty.length===5)break;
        }
        if(!dirty.length)return;
        let target;try{target=await this.target();}catch{
            this.blockedUntil=now+60000;
            for(const {row,hash} of dirty)this.db.query("UPDATE discord_notifications SET sync_target=?,sync_attempts=?,sync_after=?,last_error='Ověření Discord kanálu pro aktualizaci selhalo.' WHERE note_id=?")
                .run(hash,hash===row.sync_target?row.sync_attempts+1:1,now+60000,row.note_id);
            return;
        }
        for(const {row,message,hash} of dirty){
            if(row.guild_id!==target.guildId||row.application_id!==target.appId){
                this.db.query("UPDATE discord_notifications SET sync_target=?,sync_attempts=3,last_error='Kanál nebo bot patří k jinému serveru/aplikaci.' WHERE note_id=?").run(hash,row.note_id);continue;
            }
            const attempts=hash===row.sync_target?row.sync_attempts+1:1;
            this.db.query('UPDATE discord_notifications SET sync_target=?,sync_attempts=?,sync_after=? WHERE note_id=?').run(hash,attempts,now+60000,row.note_id);
            try{
                const response=await this.api(`/channels/${this.channelId}/messages/${row.message_id}`,{method:'PATCH',body:JSON.stringify(message)});
                if(response.ok){
                    this.db.query("UPDATE discord_notifications SET sync_hash=?,channel_id=?,sync_attempts=0,last_error='' WHERE note_id=?").run(hash,this.channelId,row.note_id);
                }else{
                    let delay=60000;
                    if(response.status===429){const data=await response.json();delay=Math.min(300,Math.max(1,Number(data.retry_after)||30))*1000;this.blockedUntil=now+delay;}
                    this.db.query('UPDATE discord_notifications SET sync_attempts=?,sync_after=?,last_error=? WHERE note_id=?').run([403,404].includes(response.status)?3:attempts,now+delay,`Aktualizace Discord karty selhala (HTTP ${response.status}).`,row.note_id);
                    if(response.status===429)break;
                }
            }catch{this.db.query("UPDATE discord_notifications SET last_error='Aktualizace Discord karty nebyla potvrzena.' WHERE note_id=?").run(row.note_id);}
        }
    }
    async tick(){
        if(!this.configured||this.running||this.blockedUntil>this.store.now())return;this.running=true;
        try{
            const now=this.store.now();
            // A restart after an uncertain POST must not create a second message.
            this.db.query("UPDATE discord_notifications SET state='failed',last_error='Doručení nebylo potvrzeno před restartem.' WHERE state='sending' AND last_attempt_at<?").run(now-30000);
            this.db.query('DELETE FROM discord_notifications WHERE created_at<?').run(now-7*86400000);
            const rows=this.db.query(`SELECT q.*,n.content,n.priority,n.status,n.type,n.in_kanban,t.name team_name,t.color team_color,e.name event_name,m.name mentor_name,s.application_id,s.guild_id,s.enabled
                FROM discord_notifications q JOIN teams t ON t.id=q.team_id JOIN events e ON e.id=q.event_id
                LEFT JOIN notes n ON n.id=q.note_id AND n.team_id=q.team_id LEFT JOIN mentors m ON m.id=n.creator_id
                JOIN discord_settings s ON s.event_id=q.event_id WHERE q.state='pending' AND q.next_attempt_at<=? AND s.enabled=1 ORDER BY q.created_at LIMIT 5`).all(now);
            if(!rows.length){await this.sync();return;}
            let target;try{target=await this.target();}catch(error){this.blockedUntil=now+60000;for(const row of rows)this.db.query("UPDATE discord_notifications SET attempts=attempts+1,state=CASE WHEN attempts>=2 THEN 'failed' ELSE 'pending' END,next_attempt_at=?,last_error=? WHERE note_id=?").run(now+60000,error.message,row.note_id);return;}
            for(const row of rows){
                if(!row.content||row.type!=='help_request'||!row.in_kanban){this.finish(row.note_id,'failed','Požadavek už není aktivní.');continue;}
                if(row.guild_id!==target.guildId||row.application_id!==target.appId){this.finish(row.note_id,'failed','Kanál nebo bot patří k jinému serveru/aplikaci.');continue;}
                const claimed=this.db.query("UPDATE discord_notifications SET state='sending',attempts=attempts+1,last_attempt_at=? WHERE note_id=? AND state='pending'").run(this.store.now(),row.note_id).changes;
                if(!claimed)continue;
                try{
                    const response=await this.api('/channels/'+this.channelId+'/messages',{method:'POST',body:JSON.stringify(mentorMessage(row,this.baseUrl,this.roleId))});
                    if(response.status===429&&row.attempts<2){const data=await response.json();const delay=Math.min(300,Math.max(1,Number(data.retry_after)||30))*1000;this.db.query("UPDATE discord_notifications SET state='pending',next_attempt_at=?,last_error='Discord omezuje rychlost zpráv.' WHERE note_id=?").run(this.store.now()+delay,row.note_id);this.blockedUntil=this.store.now()+delay;break;}
                    if(!response.ok){this.finish(row.note_id,'failed',response.status===403?'Bot nemá oprávnění View Channel, Send Messages nebo Embed Links.':`Discord odmítl oznámení (HTTP ${response.status}).`);continue;}
                    const data=await response.json();if(!snowflake(data.id))throw new Error('Invalid message receipt');this.finish(row.note_id,'sent',this.roleId&&!data.mention_roles?.includes(this.roleId)?'Zpráva odeslána, Discord nepotvrdil zmínku role.':'',data.id);
                    this.db.query('UPDATE discord_notifications SET channel_id=?,sync_hash=? WHERE note_id=?').run(this.channelId,digest(mentorEdit(row,this.baseUrl)),row.note_id);
                }catch{this.finish(row.note_id,'failed','Doručení nebylo potvrzeno. Požadavek je uložen v Kanbanu.');}
            }
            if(this.blockedUntil<=this.store.now())await this.sync();
        }finally{this.running=false;}
    }
}
