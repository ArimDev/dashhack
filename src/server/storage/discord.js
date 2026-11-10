import {randomBytes,randomUUID,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {MENTOR_STATUSES} from '../services/mentor-notifications.js';
import {StorageError,matrixAnswers} from './sqlite.js';
const fail=(message,status=400)=>{throw new StorageError(status,message);};
const snowflake=value=>typeof value==='string'&&/^\d{17,20}$/.test(value);
const hash=value=>createHash('sha256').update(value).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const SESSION_MS=2*60*60*1000,CLAIM_MS=10*60*1000;
export class DiscordStore{
    constructor(store){this.store=store;this.db=store.db;this.now=()=>store.now();}
    settingsByApp(id){return snowflake(id)?this.db.query('SELECT * FROM discord_settings WHERE application_id=?').get(id):null;}
    owner(session,name){const id=this.store.authorize(session,name),row=this.db.query('SELECT * FROM discord_settings WHERE event_id=?').get(id);
        return {configured:!!row,config:row?{applicationId:row.application_id,publicKey:row.public_key,guildId:row.guild_id,channels:JSON.parse(row.channels),enabled:!!row.enabled,revision:row.revision}:{applicationId:'',publicKey:'',guildId:'',channels:{},enabled:false,revision:0},teams:this.db.query('SELECT id,name FROM teams WHERE event_id=? ORDER BY position,id').all(id),audit:this.db.query('SELECT a.user_name AS userName,a.user_id AS userId,a.kind,a.created_at AS createdAt,t.name AS teamName FROM discord_actions a JOIN teams t ON t.id=a.team_id WHERE a.event_id=? ORDER BY a.created_at DESC LIMIT 50').all(id)};
    }
    configure(session,name,input){const id=this.store.authorize(session,name);
        if(!snowflake(input.applicationId)||!snowflake(input.guildId)||typeof input.publicKey!=='string'||!/^[a-f0-9]{64}$/i.test(input.publicKey)||typeof input.enabled!=='boolean')fail('Vyplňte ID aplikace, serveru a veřejný klíč Discordu.');
        if(!input.channels||typeof input.channels!=='object'||Array.isArray(input.channels)||Object.keys(input.channels).length>500)fail('Neplatné mapování kanálů.');
        const channels={},used=new Set();
        for(const [teamId,raw] of Object.entries(input.channels)){const channel=typeof raw==='string'?raw.trim():null;if(channel==='')continue;if(!snowflake(channel)||!this.db.query('SELECT 1 FROM teams WHERE id=? AND event_id=?').get(teamId,id)||used.has(channel))fail('Každý kanál musí patřit právě jednomu týmu této události.');channels[teamId]=channel;used.add(channel);}
        if(input.enabled&&!used.size)fail('Nejprve nastavte kanál alespoň pro jeden tým.');
        return this.db.transaction(()=>{
            const previous=this.db.query('SELECT revision FROM discord_settings WHERE event_id=?').get(id);
            if(input.revision!==(previous?.revision||0))fail('Nastavení se změnilo. Načtěte aktuální data.',409);
            if(this.db.query('SELECT 1 FROM discord_settings WHERE event_id<>? AND (application_id=? OR guild_id=?)').get(id,input.applicationId,input.guildId))fail('Aplikace nebo server už jsou připojené k jiné události.');
            this.db.query(`INSERT INTO discord_settings(event_id,application_id,public_key,guild_id,channels,enabled,link_secret,revision) VALUES(?,?,?,?,?,?,?,1) ON CONFLICT(event_id) DO UPDATE SET application_id=excluded.application_id,public_key=excluded.public_key,guild_id=excluded.guild_id,channels=excluded.channels,enabled=excluded.enabled,link_secret=excluded.link_secret,revision=discord_settings.revision+1`).run(id,input.applicationId,input.publicKey.toLowerCase(),input.guildId,JSON.stringify(channels),Number(input.enabled),randomBytes(32).toString('hex'));
            this.db.query('DELETE FROM discord_matrix_flows WHERE event_id=?').run(id);
            return this.owner(session,name);
        })();
    }
    context(payload){const settings=this.settingsByApp(payload.application_id);
        if(!settings?.enabled||settings.guild_id!==payload.guild_id||!snowflake(payload.id)||!snowflake(payload.member?.user?.id)||payload.member.user.bot)fail('Příkaz použijte v připojeném serveru a kanálu svého týmu.',403);
        const teamId=Object.entries(JSON.parse(settings.channels)).find(([,channel])=>channel===payload.channel_id)?.[0];
        const team=teamId&&this.db.query('SELECT * FROM teams WHERE id=? AND event_id=?').get(teamId,settings.event_id);
        if(!team)fail('Tento kanál nemá přiřazený tým. Požádejte pořadatele o nastavení.',403);
        return {settings,team,userId:payload.member.user.id,userName:String(payload.member.nick||payload.member.user.global_name||payload.member.user.username||'Student').slice(0,80),channelId:payload.channel_id,interactionId:payload.id};
    }
    rate(ctx,kind){const now=this.now();this.db.query('DELETE FROM discord_actions WHERE created_at<?').run(now-7*86400000);this.db.query('DELETE FROM discord_matrix_flows WHERE expires_at<?').run(now);
        if(this.db.query('SELECT COUNT(*) n FROM discord_actions WHERE event_id=?').get(ctx.settings.event_id).n>=5000)fail('Limit požadavků události byl dosažen.',429);
        const userLimit=kind==='help'?5:['matrix','github'].includes(kind)?10:30,teamLimit=kind==='help'?10:['matrix','github'].includes(kind)?20:100;
        const user=this.db.query('SELECT COUNT(*) n FROM discord_actions WHERE event_id=? AND user_id=? AND kind=? AND created_at>?').get(ctx.settings.event_id,ctx.userId,kind,now-600000).n;
        const team=this.db.query('SELECT COUNT(*) n FROM discord_actions WHERE event_id=? AND team_id=? AND kind=? AND created_at>?').get(ctx.settings.event_id,ctx.team.id,kind,now-600000).n;
        if(user>=userLimit||team>=teamLimit)fail('Příliš mnoho požadavků. Zkuste to později.',429);
    }
    record(ctx,kind,result){this.db.query('INSERT INTO discord_actions(interaction_id,event_id,team_id,user_id,user_name,kind,created_at,result) VALUES(?,?,?,?,?,?,?,?)').run(ctx.interactionId,ctx.settings.event_id,ctx.team.id,ctx.userId,ctx.userName,kind,this.now(),JSON.stringify(result));}
    previous(ctx,kind){const row=this.db.query('SELECT * FROM discord_actions WHERE interaction_id=?').get(ctx.interactionId);if(!row)return null;if(row.event_id!==ctx.settings.event_id||row.team_id!==ctx.team.id||row.user_id!==ctx.userId||row.kind!==kind)fail('Neshodný požadavek.',409);return JSON.parse(row.result);}
    help(payload,text,priority='medium'){return this.db.transaction(()=>{
        const ctx=this.context(payload),previous=this.previous(ctx,'help');if(previous)return previous;
        if(typeof text!=='string'||!text.trim()||text.length>4000||!['medium','high'].includes(priority))fail('Vyplňte požadavek (nejvýše 4 000 znaků).');
        this.rate(ctx,'help');if(this.db.query('SELECT COUNT(*) n FROM notes WHERE team_id=?').get(ctx.team.id).n>=1000)fail('Tým má příliš mnoho poznámek.',413);
        const noteId=randomUUID(),position=this.db.query('SELECT COALESCE(MAX(position),-1)+1 n FROM notes WHERE team_id=?').get(ctx.team.id).n;
        this.db.query(`INSERT INTO notes(id,team_id,content,color,priority,status,position,type,creator_id,in_kanban) VALUES(?,?,?,?,?,'To Do',?,'help_request',NULL,1)`).run(noteId,ctx.team.id,text.trim()+`\n\nDiscord: ${ctx.userName}`,ctx.team.color,priority,position);
        this.store.queueHelpNotification(ctx.settings.event_id,ctx.team.id,{id:noteId,type:'help_request',inKanban:true},ctx.userName);
        this.db.query('UPDATE teams SET revision=revision+1 WHERE id=?').run(ctx.team.id);this.store.touch(ctx.settings.event_id);
        const result={noteId,teamName:ctx.team.name};this.record(ctx,'help',result);return result;
    })();}
    mentorStatus(payload,{channelId,roleId}={}){return this.db.transaction(()=>{
        const settings=this.settingsByApp(payload.application_id),match=/^dh-status:([a-zA-Z0-9-]{1,100}):(todo|progress|done):(todo|progress|done)$/.exec(payload.data?.custom_id||'');
        if(!settings?.enabled||settings.guild_id!==payload.guild_id||!snowflake(channelId)||payload.channel_id!==channelId||
            !snowflake(payload.id)||!snowflake(payload.member?.user?.id)||payload.member.user.bot||!match||payload.data?.component_type!==2)
            fail('Toto tlačítko není dostupné.',403);
        if(!snowflake(roleId)||!Array.isArray(payload.member.roles)||!payload.member.roles.includes(roleId))
            fail('Stav mohou měnit pouze mentoři.',403);
        const row=this.db.query("SELECT * FROM discord_notifications WHERE note_id=? AND event_id=? AND state='sent' AND message_id=? AND channel_id=?")
            .get(match[1],settings.event_id,payload.message?.id||'',channelId);
        const team=row&&this.db.query('SELECT * FROM teams WHERE id=? AND event_id=?').get(row.team_id,settings.event_id);
        if(!team)fail('Karta nebyla nalezena.',404);
        const ctx={settings,team,userId:payload.member.user.id,userName:String(payload.member.nick||payload.member.user.global_name||payload.member.user.username||'Mentor').slice(0,80),channelId,interactionId:payload.id};
        const previous=this.previous(ctx,'status');if(previous)return previous;
        const note=this.db.query('SELECT * FROM notes WHERE id=? AND team_id=?').get(row.note_id,team.id);
        if(!note||note.type!=='help_request'||!note.in_kanban)fail('Požadavek už není aktivní.',409);
        if(note.status!==MENTOR_STATUSES[match[2]])fail('Stav se mezitím změnil. Počkejte na aktualizaci karty.',409);
        this.rate(ctx,'status');
        const status=MENTOR_STATUSES[match[3]];
        if(status!==note.status){
            this.db.query('UPDATE notes SET status=? WHERE id=? AND team_id=?').run(status,note.id,team.id);
            this.db.query('UPDATE teams SET revision=revision+1 WHERE id=?').run(team.id);this.store.touch(settings.event_id);
        }
        const result={noteId:note.id,from:note.status,status};this.record(ctx,'status',result);return result;
    })();}
    githubLink(payload,invites){return this.db.transaction(()=>{
        const ctx=this.context(payload),previous=this.previous(ctx,'github');
        if(!invites)fail('GitHub připojení není dostupné. Požádejte pořadatele.',503);
        // Resolve the current organizer-issued link on every delivery. Revocation
        // and repository/installation changes must also invalidate Discord retries.
        const link=invites.linkForTeam(ctx.settings.event_id,ctx.team.id);
        if(!previous){this.rate(ctx,'github');this.record(ctx,'github',{linkId:link.linkId});}
        return {url:link.url,teamName:ctx.team.name};
    })();}
    token(flow,settings){return createHmac('sha256',settings.link_secret).update(flow.id+':'+flow.user_id).digest('hex');}
    matrixLink(payload){return this.db.transaction(()=>{
        const ctx=this.context(payload),previous=this.previous(ctx,'matrix');
        if(previous){const flow=this.db.query('SELECT * FROM discord_matrix_flows WHERE id=? AND expires_at>?').get(previous.flowId,this.now());if(!flow)fail('Odkaz vypršel. Použijte znovu /matice.',410);return {id:flow.id,token:this.token(flow,ctx.settings),teamName:ctx.team.name};}
        this.rate(ctx,'matrix');if(this.db.query('SELECT COUNT(*) n FROM discord_matrix_flows WHERE event_id=?').get(ctx.settings.event_id).n>=500)fail('Příliš mnoho otevřených formulářů.',429);
        const flow={id:randomUUID(),user_id:ctx.userId};this.db.query('INSERT INTO discord_matrix_flows(id,event_id,team_id,channel_id,user_id,user_name,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').run(flow.id,ctx.settings.event_id,ctx.team.id,ctx.channelId,ctx.userId,ctx.userName,this.now(),this.now()+SESSION_MS);
        this.record(ctx,'matrix',{flowId:flow.id});return {id:flow.id,token:this.token(flow,ctx.settings),teamName:ctx.team.name};
    })();}
    activeFlow(id){const flow=typeof id==='string'&&id.length<=100?this.db.query('SELECT * FROM discord_matrix_flows WHERE id=?').get(id):null;
        const settings=flow&&this.db.query('SELECT * FROM discord_settings WHERE event_id=?').get(flow.event_id);
        if(!flow||flow.expires_at<=this.now()||!settings?.enabled||JSON.parse(settings.channels)[flow.team_id]!==flow.channel_id)fail('Platnost přístupu skončila. Otevřete nový odkaz přes /matice.',401);
        return {flow,settings};
    }
    claim(id,token,cookie){return this.db.transaction(()=>{
        const {flow,settings}=this.activeFlow(id);
        if(!equal(token,this.token(flow,settings)))fail('Neplatný odkaz.',401);
        if(flow.claimed_at){this.session(cookie);if(cookie?.split('.')[0]!==id)fail('Odkaz už byl otevřen v jiném prohlížeči. Použijte /matice.',409);return {cookie,data:this.matrix(cookie)};}
        if(this.now()-flow.created_at>CLAIM_MS)fail('Odkaz vypršel. Použijte znovu /matice.',410);
        const secret=randomBytes(32).toString('hex');this.db.query('UPDATE discord_matrix_flows SET claimed_at=?,session_hash=? WHERE id=? AND claimed_at IS NULL').run(this.now(),hash(secret),id);
        const session=id+'.'+secret;return {cookie:session,data:this.matrix(session)};
    })();}
    session(cookie){const [id,secret,extra]=typeof cookie==='string'?cookie.split('.'):[];if(extra||!secret||!/^[a-f0-9]{64}$/.test(secret))fail('Otevřete formulář příkazem /matice v Discordu.',401);
        const {flow,settings}=this.activeFlow(id);if(!flow.claimed_at||!equal(flow.session_hash,hash(secret)))fail('Neplatný přístup.',401);
        const team=this.db.query('SELECT * FROM teams WHERE id=? AND event_id=?').get(flow.team_id,flow.event_id);if(!team)fail('Tým nebyl nalezen.',404);
        return {flow,settings,team};
    }
    matrix(cookie){const {flow,team}=this.session(cookie);return {teamName:team.name,teamColor:team.color,startupMatrix:JSON.parse(team.startup_matrix),revision:team.revision,studentName:flow.user_name,expiresAt:flow.expires_at};}
    saveMatrix(cookie,input){const patch=matrixAnswers(input.answers);if(!Object.keys(patch).length)fail('Nebyly změněny žádné odpovědi.');
        return this.db.transaction(()=>{const {flow,settings,team}=this.session(cookie);if(input.revision!==team.revision)fail('Tým mezitím někdo změnil. Rozepsané odpovědi zůstaly zachované.',409);
            const ctx={settings,team,userId:flow.user_id,userName:flow.user_name,interactionId:'web-'+randomUUID()};this.rate(ctx,'matrix_save');
            const matrix={...JSON.parse(team.startup_matrix),...patch};this.db.query('UPDATE teams SET startup_matrix=?,revision=revision+1 WHERE id=?').run(JSON.stringify(matrix),team.id);this.store.touch(flow.event_id);
            this.record(ctx,'matrix_save',{fields:Object.keys(patch)});return this.matrix(cookie);
        })();
    }
}
