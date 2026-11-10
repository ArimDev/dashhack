import {test,expect,afterEach} from 'bun:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqliteStore} from '../../src/server/storage/sqlite.js';
import {TeamInvites} from '../../src/server/services/team-invites.js';
import {GitHubAppService} from '../../src/server/services/github-app.js';
import {DiscordStore} from '../../src/server/storage/discord.js';
import {verifyDiscordSignature,discordInteraction,registerDiscordCommands} from '../../src/server/services/discord.js';
const stores=[],dirs=[];afterEach(()=>{for(const s of stores.splice(0))try{s.close();}catch{}for(const d of dirs.splice(0))rmSync(d,{recursive:true,force:true});});
const keys=generateKeyPairSync('ed25519'),publicKey=keys.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex');
const APP='123456789012345678',GUILD='223456789012345678',CHANNEL='323456789012345678',USER='423456789012345678';let interaction=523456789012345678n;
const answer=text=>[{type:'paragraph',runs:[{text,bold:true,italic:false}]}];
async function setup(){let now=1800000000000;const store=new SqliteStore(':memory:',{now:()=>now});stores.push(store);const eventId=await store.createEvent('Discord event','password123'),session=store.createSession(eventId),teamId=store.addTeam(session,'Discord event',{teamName:'Team One',teamColor:'#1565c0'}),otherTeam=store.addTeam(session,'Discord event',{teamName:'Team Two',teamColor:'#E53935'});const discord=new DiscordStore(store);const config={applicationId:APP,publicKey,guildId:GUILD,channels:{[teamId]:CHANNEL},enabled:true,revision:0};discord.configure(session,'Discord event',config);
 const payload=(extra={})=>({id:String(interaction++),application_id:APP,guild_id:GUILD,channel_id:CHANNEL,member:{user:{id:USER,username:'Verified student'}},type:2,data:{name:'matice'},...extra});
 return {store,discord,eventId,session,teamId,otherTeam,config,payload,advance:ms=>{now+=ms;}};
}
test('schema 8 upgrades to 11 without changing event, team, matrix, notes or active sessions',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dashhack-discord-migration-'));dirs.push(dir);const file=join(dir,'app.sqlite'),store=new SqliteStore(file);stores.push(store);
 const id=await store.createEvent('Migration','password123'),session=store.createSession(id),teamId=store.addTeam(session,'Migration',{teamName:'Keep',teamColor:'#123456'});
 store.editStartupMatrix(session,'Migration',{teamId,revision:0,answers:{problem:answer('Keep answer')}});const before=store.getEvent('Migration');
 store.db.exec('DROP TABLE IF EXISTS discord_notifications; DROP TABLE discord_matrix_flows; DROP TABLE discord_actions; DROP TABLE discord_settings; PRAGMA user_version=8;');store.close();const reopened=new SqliteStore(file);stores.push(reopened);
 expect(reopened.db.query('PRAGMA user_version').get().user_version).toBe(11);expect(reopened.getEvent('Migration')).toEqual(before);expect(reopened.getSession(session).eventId).toBe(id);expect(reopened.db.query('SELECT COUNT(*) n FROM discord_settings').get().n).toBe(0);
});
test('Discord settings are owner-only, revision checked, unique and omit private link keys',async()=>{
 const c=await setup();expect(()=>c.discord.owner(null,'Discord event')).toThrow();const other=await c.store.createEvent('Other','password123');expect(()=>c.discord.owner(c.store.createSession(other),'Discord event')).toThrow();
 expect(JSON.stringify(c.discord.owner(c.session,'Discord event'))).not.toContain('link_secret');
 expect(()=>c.discord.configure(c.session,'Discord event',c.config)).toThrow('změnilo');
 expect(()=>c.discord.configure(c.session,'Discord event',{...c.config,revision:1,channels:{[c.teamId]:CHANNEL,[c.otherTeam]:CHANNEL}})).toThrow('právě jednomu');
 expect(()=>c.discord.configure(c.session,'Discord event',{...c.config,revision:1,channels:{foreign:CHANNEL}})).toThrow();
});
test('Ed25519 verification rejects modified bodies, invalid keys and expired/future timestamps',()=>{
 const raw=Buffer.from('{"type":1}'),now=1800000000000,timestamp=String(now/1000),sig=sign(null,Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('hex');
 expect(verifyDiscordSignature(raw,sig,timestamp,publicKey,now)).toBe(true);expect(verifyDiscordSignature(Buffer.from('{}'),sig,timestamp,publicKey,now)).toBe(false);expect(verifyDiscordSignature(raw,sig,timestamp,publicKey,now+301000)).toBe(false);expect(verifyDiscordSignature(raw,sig,timestamp,publicKey,now-301000)).toBe(false);expect(verifyDiscordSignature(raw,'bad',timestamp,publicKey,now)).toBe(false);expect(verifyDiscordSignature(raw,sig,timestamp,'x',now)).toBe(false);
});
test('mentor requests use verified team scope, are idempotent and keep all existing project/matrix data',async()=>{
 const c=await setup();c.store.editStartupMatrix(c.session,'Discord event',{teamId:c.teamId,revision:0,answers:{problem:answer('Original answer')}});const before=c.store.getEvent('Discord event').teams[0];
 const payload=c.payload({type:5});const created=c.discord.help(payload,'Pomoc s API','high');expect(c.discord.help(payload,'Retry must not overwrite','medium')).toEqual(created);
 const after=c.store.getEvent('Discord event').teams[0];expect(after.revision).toBe(before.revision+1);expect(after.startupMatrix).toEqual(before.startupMatrix);expect(after.stickyNotes).toHaveLength(1);expect(after.stickyNotes[0]).toMatchObject({type:'help_request',inKanban:true,status:'To Do',priority:'high',creatorId:null,color:'#1565c0'});expect(after.stickyNotes[0].content).toContain('Verified student');
 expect(()=>c.discord.help(c.payload({guild_id:'999456789012345678'}),'Denied')).toThrow();expect(()=>c.discord.help(c.payload({channel_id:'999456789012345678'}),'Denied')).toThrow();expect(()=>c.discord.help(c.payload(),'Not allowed','critical')).toThrow();
 expect(c.store.getEvent('Discord event').teams[1].stickyNotes).toHaveLength(0);
});
test('request limits count real submissions, not Discord delivery retries',async()=>{
 const c=await setup();for(let i=0;i<5;i++){const p=c.payload();c.discord.help(p,'Help '+i);c.discord.help(p,'Retry');}expect(()=>c.discord.help(c.payload(),'Over limit')).toThrow('Příliš mnoho');c.advance(600001);expect(c.discord.help(c.payload(),'Allowed again').noteId).toBeTruthy();
});
test('matrix links claim once, bind to a separate browser session, expire and never grant event access',async()=>{
 const c=await setup(),payload=c.payload(),link=c.discord.matrixLink(payload);expect(c.discord.matrixLink(payload)).toEqual(link);expect(()=>c.discord.claim(link.id,'f'.repeat(64))).toThrow();
 const claimed=c.discord.claim(link.id,link.token);expect(claimed.data.teamName).toBe('Team One');expect(JSON.stringify(claimed.data)).not.toContain('link_secret');expect(JSON.stringify(claimed.data)).not.toContain('session_hash');
 expect(()=>c.discord.claim(link.id,link.token)).toThrow();expect(c.discord.claim(link.id,link.token,claimed.cookie).cookie).toBe(claimed.cookie);expect(()=>c.store.authorize(claimed.cookie,'Discord event')).toThrow();
 c.advance(7200001);expect(()=>c.discord.matrix(claimed.cookie)).toThrow('Platnost');
});
test('claim deadline, configuration changes and channel removal revoke matrix access',async()=>{
 const c=await setup(),link=c.discord.matrixLink(c.payload());c.advance(600001);expect(()=>c.discord.claim(link.id,link.token)).toThrow('vypršel');
 const next=c.discord.matrixLink(c.payload()),cookie=c.discord.claim(next.id,next.token).cookie;
 c.discord.configure(c.session,'Discord event',{...c.config,revision:1,enabled:false});expect(()=>c.discord.matrix(cookie)).toThrow('Platnost');expect(()=>c.discord.context(c.payload())).toThrow();
});
test('student matrix saves patch only scoped answers and preserve mentor/notes; stale or forged fields cannot overwrite',async()=>{
 const c=await setup(),mentor=c.store.addMentor(c.session,'Discord event',{name:'Mentor'});
 c.store.editStartupMatrix(c.session,'Discord event',{teamId:c.teamId,revision:0,mentorId:mentor.id,answers:{solution:answer('Mentor solution')}});
 const link=c.discord.matrixLink(c.payload()),cookie=c.discord.claim(link.id,link.token).cookie,initial=c.discord.matrix(cookie);
 const updated=c.discord.saveMatrix(cookie,{teamId:c.otherTeam,revision:initial.revision,answers:{problem:answer('Student problem')}});
 expect(updated.startupMatrix.solution).toEqual(answer('Mentor solution'));expect(updated.startupMatrix.problem).toEqual(answer('Student problem'));expect(c.store.getEvent('Discord event').teams[0].matrixMentorId).toBe(mentor.id);expect(c.store.getEvent('Discord event').teams[1].startupMatrix).toEqual({});
 expect(()=>c.discord.saveMatrix(cookie,{revision:initial.revision,answers:{problem:answer('Stale')}})).toThrow('mezitím');expect(()=>c.discord.saveMatrix(cookie,{revision:updated.revision,answers:{bad:[]}})).toThrow();expect(()=>c.discord.saveMatrix(cookie,{revision:updated.revision,answers:{problem:answer('x'.repeat(50001))}})).toThrow();
});
test('Discord interactions return private modals/links, ignore mention pings, and create help only on submit',async()=>{
 const c=await setup();expect(discordInteraction({type:1},c.discord,'https://example.org')).toEqual({type:1});
 const modal=discordInteraction(c.payload({data:{name:'mentor'}}),c.discord,'https://example.org');expect(modal.type).toBe(9);expect(c.store.getEvent('Discord event').teams[0].stickyNotes).toHaveLength(0);
 const submitted=discordInteraction(c.payload({type:5,data:{custom_id:modal.data.custom_id,components:[{type:18,component:{type:4,custom_id:'request',value:'Help'}},{type:18,component:{type:3,custom_id:'urgency',values:['high']}}]}}),c.discord,'https://example.org');expect(submitted.data.flags).toBe(64);expect(submitted.data.allowed_mentions.parse).toEqual([]);
 const link=discordInteraction(c.payload(),c.discord,'https://example.org');expect(link.data.components[0].components[0].url).toContain('/discord/matrix#');expect(link.data.flags).toBe(64);
});
test('command registration upserts only our four commands without storing credentials or deleting other commands',async()=>{
 const calls=[];await registerDiscordCommands({applicationId:APP,guildId:GUILD},'secret-token',async(url,options)=>{calls.push({url,options});return {ok:true};});expect(calls).toHaveLength(4);expect(calls.every(c=>c.options.method==='POST'&&c.url.startsWith('https://discord.com/api/v10/'))).toBe(true);expect(calls.map(c=>JSON.parse(c.options.body).name)).toEqual(['mentor','help','matice','github']);expect(JSON.parse(calls[0].options.body).options).toEqual([]);
 await expect(registerDiscordCommands({applicationId:APP,guildId:GUILD},'secret-token',async()=>({ok:false,status:401}))).rejects.toThrow('Ověřte token');
});

function githubSetup(c){
 c.store.db.query('UPDATE teams SET github=? WHERE id=?').run('https://github.com/school/team',c.teamId);
 const flow=c.store.beginGitHubFlow(c.session,'Discord event',[{id:123,account:'school',type:'Organization'}]);c.store.connectGitHub(c.session,flow.id,123,'42');
 const app=new GitHubAppService({githubAppId:'42',githubAppClientId:'client',githubAppClientSecret:'secret',githubAppPrivateKey:'pem',githubAppSlug:'test',githubAppBaseUrl:'https://dashhack.test'});
 return new TeamInvites(c.store,app,'private-test-invite-secret-12345678901234567890');
}
test('Discord GitHub links reuse only the mapped team invitation, stay private and never persist bearer links',async()=>{
 const c=await setup(),invites=githubSetup(c);
 const payload=c.payload({data:{name:'github'}});
 expect(discordInteraction(payload,c.discord,'https://dashhack.test',{githubInvites:invites}).data.content).toContain('není připravená');
 const issued=invites.issue(c.session,'Discord event',{teamId:c.teamId}).links[0];
 const reply=discordInteraction(payload,c.discord,'https://dashhack.test',{githubInvites:invites});
 expect(reply.data.flags).toBe(64);expect(reply.data.components[0].components[0].url).toBe(issued.url);expect(reply.data.content).toContain('Team One');
 expect(c.discord.githubLink(payload,invites).url).toBe(issued.url);expect(c.store.db.query("SELECT COUNT(*) n FROM discord_actions WHERE kind='github'").get().n).toBe(1);
 expect(JSON.stringify(c.store.db.query('SELECT * FROM discord_actions').all())).not.toContain(issued.url.split('#')[1]);
 expect(()=>c.discord.githubLink(c.payload({channel_id:'999999999999999999'}),invites)).toThrow();
 expect(c.store.getEvent('Discord event').teams[0].stickyNotes).toHaveLength(0);
 invites.manage(c.session,'Discord event',{action:'revoke',linkId:issued.linkId});
 expect(()=>c.discord.githubLink(payload,invites)).toThrow('není připravená');expect(c.store.db.query("SELECT COUNT(*) n FROM team_invite_links WHERE state='active'").get().n).toBe(0);
});
test('Discord GitHub delivery respects expiry, repository changes and rate limits',async()=>{
 const c=await setup(),invites=githubSetup(c);invites.issue(c.session,'Discord event',{teamId:c.teamId});
 for(let i=0;i<10;i++)c.discord.githubLink(c.payload(),invites);
 expect(()=>c.discord.githubLink(c.payload(),invites)).toThrow('Příliš mnoho');
 c.advance(600001);c.store.db.query('UPDATE teams SET github=? WHERE id=?').run('https://github.com/school/changed',c.teamId);
 expect(()=>c.discord.githubLink(c.payload(),invites)).toThrow('changed');
 c.store.db.query('UPDATE teams SET github=? WHERE id=?').run('https://github.com/school/team',c.teamId);c.advance(7*86400000);
 expect(()=>c.discord.githubLink(c.payload(),invites)).toThrow('vypršela');
});
test('mentor form requires one urgency choice, blocks forged priorities and keeps old open forms compatible',async()=>{
 const c=await setup(),modal=discordInteraction(c.payload({data:{name:'mentor'}}),c.discord,'https://example.org');
 expect(modal.data.components[1].component).toMatchObject({type:3,custom_id:'urgency',required:true,options:[{label:'Běžná',value:'medium',default:true},{label:'Naléhavá',value:'high',default:false}]});
 const text={type:18,component:{type:4,custom_id:'request',value:'Help'}};
 for(const values of [[],['critical'],['medium','high']]){const r=discordInteraction(c.payload({type:5,data:{custom_id:'dashhack-mentor',components:[text,{type:18,component:{type:3,custom_id:'urgency',values}}]}}),c.discord,'https://example.org');expect(r.data.content).toContain('naléhavost');}
 expect(c.store.getEvent('Discord event').teams[0].stickyNotes).toHaveLength(0);
 discordInteraction(c.payload({type:5,data:{custom_id:'dashhack-mentor',components:[text,{type:18,component:{type:3,custom_id:'urgency',values:['medium']}}]}}),c.discord,'https://example.org');
 discordInteraction(c.payload({type:5,data:{custom_id:'dashhack-mentor-high',components:[text]}}),c.discord,'https://example.org');
 expect(c.store.getEvent('Discord event').teams[0].stickyNotes.map(n=>n.priority)).toEqual(['medium','high']);
});

test('/help shares the mentor form, validated submissions, notification queue, scope and rate limits',async()=>{
 const c=await setup();
 const mentor=discordInteraction(c.payload({data:{name:'mentor'}}),c.discord,'https://dashhack.test');
 const help=discordInteraction(c.payload({data:{name:'help'}}),c.discord,'https://dashhack.test');expect(help).toEqual(mentor);
 expect(c.store.getEvent('Discord event').teams[0].stickyNotes).toHaveLength(0);
 const payload=c.payload({type:5,data:{custom_id:help.data.custom_id,components:[{type:18,component:{type:4,custom_id:'request',value:'Help alias request'}},{type:18,component:{type:3,custom_id:'urgency',values:['high']}}]}});
 const reply=discordInteraction(payload,c.discord,'https://dashhack.test');expect(reply.data.flags).toBe(64);expect(reply.data.content).toContain('Kanbanu');
 discordInteraction(payload,c.discord,'https://dashhack.test');
 const team=c.store.getEvent('Discord event').teams[0];expect(team.stickyNotes).toHaveLength(1);expect(team.stickyNotes[0]).toMatchObject({type:'help_request',status:'To Do',priority:'high',inKanban:true});
 expect(c.store.db.query('SELECT COUNT(*) n FROM discord_notifications').get().n).toBe(1);
 const denied=discordInteraction(c.payload({channel_id:'999999999999999999',data:{name:'help'}}),c.discord,'https://dashhack.test');expect(denied.type).toBe(4);expect(denied.data.flags).toBe(64);
 for(let i=0;i<4;i++)c.discord.help(c.payload(),'Existing mentor request');
 const limited=discordInteraction({...payload,id:'999999999999999998'},c.discord,'https://dashhack.test');expect(limited.data.content).toContain('Příliš mnoho');
});
