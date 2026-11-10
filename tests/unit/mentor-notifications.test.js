import {test,expect,afterEach} from 'bun:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {SqliteStore} from '../../src/server/storage/sqlite.js';
import {DiscordStore} from '../../src/server/storage/discord.js';
import {discordInteraction} from '../../src/server/services/discord.js';
import {MentorNotifier,mentorMessage} from '../../src/server/services/mentor-notifications.js';
const stores=[],dirs=[];afterEach(()=>{for(const s of stores.splice(0))try{s.close();}catch{}for(const d of dirs.splice(0))rmSync(d,{recursive:true,force:true});});
const APP='123456789012345678',GUILD='223456789012345678',TEAM_CHANNEL='323456789012345678',MENTOR_CHANNEL='1285378043099086852';let id=623456789012345678n;
async function setup(filename=':memory:'){
 let now=1800000000000;const store=new SqliteStore(filename,{now:()=>now});stores.push(store);const eventId=await store.createEvent('Event','password123'),session=store.createSession(eventId),teamId=store.addTeam(session,'Event',{teamName:'Team',teamColor:'#1565c0'}),discord=new DiscordStore(store);
 discord.configure(session,'Event',{applicationId:APP,publicKey:'a'.repeat(64),guildId:GUILD,channels:{[teamId]:TEAM_CHANNEL},enabled:true,revision:0});
 const payload=()=>({id:String(id++),application_id:APP,guild_id:GUILD,channel_id:TEAM_CHANNEL,member:{user:{id:'423456789012345678',username:'Verified student'}}});
 const calls=[];let post=async()=>({ok:true,status:200,json:async()=>({id:'723456789012345678'})}),appId=APP,guildId=GUILD,metadataOK=true;
 const request=async(url,options)=>{calls.push({url,options});if(['POST','PATCH'].includes(options.method))return post(url,options);return {ok:metadataOK,status:metadataOK?200:403,json:async()=>url.includes('applications')?{id:appId}:{id:MENTOR_CHANNEL,guild_id:guildId,type:0}};};
 const options={token:'private-test-token',channelId:MENTOR_CHANNEL,baseUrl:'https://dashhack.test',request},notifier=new MentorNotifier(store,options);
 return {store,discord,eventId,session,teamId,payload,calls,notifier,options,advance:ms=>now+=ms,setPost:fn=>post=fn,setApp:value=>appId=value,setGuild:value=>guildId=value,setMetadata:value=>metadataOK=value,rows:()=>store.db.query('SELECT * FROM discord_notifications').all()};
}
test('new Discord requests queue atomically and produce one styled, private-channel-safe linked card despite duplicate delivery',async()=>{
 const c=await setup(),p=c.payload(),result=c.discord.help(p,'Pomoc s **API** @everyone <@123>','high');c.discord.help(p,'Retry','medium');expect(c.rows()).toHaveLength(1);await Promise.all([c.notifier.tick(),c.notifier.tick()]);await c.notifier.tick();
 const posts=c.calls.filter(c=>c.options.method==='POST');expect(posts).toHaveLength(1);const message=JSON.parse(posts[0].options.body);expect(message.allowed_mentions.parse).toEqual([]);expect(message.enforce_nonce).toBe(true);expect(message.nonce.length).toBeLessThanOrEqual(25);expect(message.embeds[0].color).toBe(0xf59e0b);expect(message.embeds[0].description).toContain('\\*\\*API\\*\\*');expect(message.embeds[0].description).not.toContain('@everyone');expect(message.embeds[0].description).not.toContain('<@123>');expect(message.components[0].components[0].url).toBe('https://dashhack.test/app/Event/kanban?note='+result.noteId);expect(message.embeds[0].fields[2].value).toBe('Verified student');expect(c.rows()[0].state).toBe('sent');expect(c.store.getEvent('Event').teams[0].stickyNotes).toHaveLength(1);
});
test('DashHack queues new tracked help requests only; whole-team saves retain sent markers without announcing edits twice',async()=>{
 const c=await setup(),note={id:'app-note',content:'App help',priority:'critical',type:'help_request',inKanban:true},plain={id:'plain',content:'Mentor note',type:'mentor_note',inKanban:true},untracked={id:'untracked',content:'Draft help',type:'help_request',inKanban:false};
 const fields={teamId:c.teamId,teamName:'Team',teamColor:'#1565c0',stickyNotes:[note,plain,untracked]};c.store.editTeam(c.session,'Event',{...fields,revision:0});expect(c.rows()).toHaveLength(1);await c.notifier.tick();expect(c.rows()[0].state).toBe('sent');
 c.store.editTeam(c.session,'Event',{...fields,revision:1,stickyNotes:[{...note,content:'Edited'},plain,untracked]});expect(c.rows()).toHaveLength(1);await c.notifier.tick();expect(c.calls.filter(c=>c.options.method==='POST')).toHaveLength(1);expect(c.store.getEvent('Event').teams[0].stickyNotes[0].content).toBe('Edited');
});
test('wrong Discord server/application and disabled integration never post a request to another channel',async()=>{
 const c=await setup();c.discord.help(c.payload(),'Help');c.setGuild('999999999999999999');await c.notifier.tick();expect(c.rows()[0].state).toBe('failed');expect(c.calls.some(c=>c.options.method==='POST')).toBe(false);
 const d=await setup();d.discord.help(d.payload(),'Help');d.store.db.query('UPDATE discord_settings SET enabled=0').run();await d.notifier.tick();expect(d.calls).toHaveLength(0);expect(d.rows()[0].state).toBe('pending');
 const e=await setup();e.discord.help(e.payload(),'Help');e.setApp('999999999999999999');await e.notifier.tick();expect(e.calls.some(c=>c.options.method==='POST')).toBe(false);
});
test('uncertain deliveries are terminal and survive restarts without duplicate posts or losing the Kanban request',async()=>{
 const c=await setup();c.discord.help(c.payload(),'Help');c.setPost(async()=>{throw new Error('Timeout with private-token');});await c.notifier.tick();await new MentorNotifier(c.store,c.options).tick();expect(c.rows()[0].state).toBe('failed');expect(c.rows()[0].last_error).not.toContain('private-token');expect(c.calls.filter(c=>c.options.method==='POST')).toHaveLength(1);expect(c.store.getEvent('Event').teams[0].stickyNotes).toHaveLength(1);
 const d=await setup();d.discord.help(d.payload(),'Help');d.store.db.query("UPDATE discord_notifications SET state='sending',last_attempt_at=?").run(d.store.now()-31000);await d.notifier.tick();expect(d.rows()[0].state).toBe('failed');expect(d.calls.filter(c=>c.options.method==='POST')).toHaveLength(0);
});
test('rate limits retry only rejected messages after the requested delay and stop after three attempts',async()=>{
 const c=await setup();c.discord.help(c.payload(),'Help');let posts=0;c.setPost(async()=>++posts===1?{ok:false,status:429,json:async()=>({retry_after:5})}:{ok:true,status:200,json:async()=>({id:'723456789012345678'})});await c.notifier.tick();expect(c.rows()[0].state).toBe('pending');c.advance(4000);await c.notifier.tick();expect(posts).toBe(1);c.advance(1100);await c.notifier.tick();expect(posts).toBe(2);expect(c.rows()[0].state).toBe('sent');
 const d=await setup();d.discord.help(d.payload(),'Help');d.setPost(async()=>({ok:false,status:429,json:async()=>({retry_after:1})}));for(let i=0;i<5;i++){await d.notifier.tick();d.advance(1100);}expect(d.rows()[0].state).toBe('failed');expect(d.calls.filter(c=>c.options.method==='POST')).toHaveLength(3);
});
test('missing credentials do no network work; metadata failures are bounded and deleted requests are skipped',async()=>{
 const c=await setup();c.discord.help(c.payload(),'Help');await new MentorNotifier(c.store,{...c.options,token:''}).tick();expect(c.calls).toHaveLength(0);expect(c.rows()[0].state).toBe('pending');c.setMetadata(false);for(let i=0;i<5;i++){await c.notifier.tick();c.advance(60001);}expect(c.rows()[0].state).toBe('failed');expect(c.calls).toHaveLength(6);
 const d=await setup(),n=d.discord.help(d.payload(),'Help');d.store.db.query('DELETE FROM notes WHERE id=?').run(n.noteId);await d.notifier.tick();expect(d.rows()[0].state).toBe('failed');expect(d.calls.filter(c=>c.options.method==='POST')).toHaveLength(0);
});
test('schema 9 upgrade preserves content and existing sessions without replaying historical requests',async()=>{
 const dir=mkdtempSync('/tmp/dashhack-notification-migration-');dirs.push(dir);const c=await setup(dir+'/app.sqlite');c.discord.help(c.payload(),'Existing help');const before=c.store.getEvent('Event');c.store.db.exec('DROP TABLE discord_notifications; PRAGMA user_version=9;');c.store.close();const reopened=new SqliteStore(dir+'/app.sqlite',{now:()=>1800000000000});stores.push(reopened);expect(reopened.getEvent('Event')).toEqual(before);expect(reopened.getSession(c.session).eventId).toBe(c.eventId);expect(reopened.db.query('PRAGMA user_version').get().user_version).toBe(11);expect(reopened.db.query('SELECT COUNT(*) n FROM discord_notifications').get().n).toBe(0);
});
test('long Unicode/Markdown fields stay inside Discord limits, links contain no login secrets and team colors are retained',()=>{
 const row={note_id:'note',event_name:'ATT Hackathon Junior 2026',team_name:'😀*'.repeat(100),team_color:'#1565c0',priority:'medium',status:'To Do',content:'**@everyone**😀'.repeat(500),author:'<@123> Student',created_at:1800000000000};const message=mentorMessage(row,'https://dashhack.test');expect(message.embeds[0].title.length).toBeLessThanOrEqual(256);expect(message.embeds[0].description.length).toBeLessThanOrEqual(1501);expect(message.embeds[0].color).toBe(0x1565c0);expect(message.embeds[0].url).toContain('/ATT%20Hackathon%20Junior%202026/kanban?note=note');expect(message.embeds[0].url).not.toContain('token');
});

test('only the explicitly configured mentor role can be pinged; role must be mentionable and belong to the target guild',async()=>{
 const c=await setup(),roleId='1285378042478329872';c.setPost(async()=>({ok:true,status:200,json:async()=>({id:'723456789012345678',mention_roles:[roleId]})}));c.discord.help(c.payload(),'Ping @everyone <@&999999999999999999>');
 const request=async(url,options)=>url.endsWith('/roles')?{ok:true,json:async()=>[{id:roleId,mentionable:true}]}:c.options.request(url,options);
 await new MentorNotifier(c.store,{...c.options,roleId,request}).tick();const message=JSON.parse(c.calls.find(c=>c.options.method==='POST').options.body);
 expect(message.content).toBe('<@&'+roleId+'>');expect(message.allowed_mentions).toEqual({parse:[],roles:[roleId]});expect(c.rows()[0].last_error).toBe('');expect(message.embeds[0].description).not.toContain('@everyone');
 const d=await setup();d.discord.help(d.payload(),'Help');await new MentorNotifier(d.store,{...d.options,roleId,request:async(url,options)=>url.endsWith('/roles')?{ok:true,json:async()=>[{id:roleId,mentionable:false}]}:d.options.request(url,options)}).tick();expect(d.calls.filter(c=>c.options.method==='POST')).toHaveLength(0);expect(d.rows()[0].last_error).toContain('zmínitelná');
});

const ROLE='1285378042478329872';
function statusPayload(c,noteId,from='todo',to='done',extra={}){
 return {...c.payload(),type:3,channel_id:MENTOR_CHANNEL,message:{id:'723456789012345678'},member:{user:{id:'823456789012345678',username:'Mentor verified'},roles:[ROLE]},
  data:{component_type:2,custom_id:`dh-status:${noteId}:${from}:${to}`},...extra};
}
const controls={channelId:MENTOR_CHANNEL,roleId:ROLE};
test('mentor buttons complete and reopen scoped notes, audit verified identity, reject stale clicks and deduplicate retries',async()=>{
 const c=await setup(),note=c.discord.help(c.payload(),'Help');await c.notifier.tick();
 const first=statusPayload(c,note.noteId);expect(discordInteraction(first,c.discord,'https://dashhack.test',{mentorControls:controls})).toEqual({type:6});
 expect(c.discord.mentorStatus(first,controls).status).toBe('Done');
 let team=c.store.getEvent('Event').teams[0];expect(team.revision).toBe(2);expect(team.stickyNotes[0].status).toBe('Done');
 expect(()=>c.discord.mentorStatus(statusPayload(c,note.noteId),controls)).toThrow('mezitím');
 const reopen=statusPayload(c,note.noteId,'done','progress');c.discord.mentorStatus(reopen,controls);
 // A delayed delivery of the old successful interaction must not undo reopening.
 c.discord.mentorStatus(first,controls);team=c.store.getEvent('Event').teams[0];expect(team.revision).toBe(3);expect(team.stickyNotes[0].status).toBe('In Progress');
 const audits=c.store.db.query("SELECT user_id,user_name,result FROM discord_actions WHERE kind='status'").all();expect(audits).toHaveLength(2);expect(audits[0].user_id).toBe('823456789012345678');expect(audits[0].user_name).toBe('Mentor verified');
});
test('status buttons deny students, wrong guild/app/channel/message, unconfigured roles and inactive notes',async()=>{
 const c=await setup(),note=c.discord.help(c.payload(),'Help');await c.notifier.tick();
 for(const extra of [{member:{user:{id:'823456789012345678'},roles:[]}}, {guild_id:'999999999999999999'}, {application_id:'999999999999999999'}, {channel_id:TEAM_CHANNEL}, {message:{id:'999999999999999999'}}, {member:{user:{id:'823456789012345678',bot:true},roles:[ROLE]}}]){
  expect(()=>c.discord.mentorStatus(statusPayload(c,note.noteId,'todo','done',extra),controls)).toThrow();
 }
 expect(()=>c.discord.mentorStatus(statusPayload(c,note.noteId),{channelId:MENTOR_CHANNEL})).toThrow();
 c.store.db.query('UPDATE notes SET in_kanban=0 WHERE id=?').run(note.noteId);expect(()=>c.discord.mentorStatus(statusPayload(c,note.noteId),controls)).toThrow('aktivní');
 expect(c.store.db.query("SELECT COUNT(*) n FROM discord_actions WHERE kind='status'").get().n).toBe(0);
});
test('Kanban and Discord changes PATCH the same card without new messages or role pings, including reopen and delete',async()=>{
 const c=await setup(),note=c.discord.help(c.payload(),'Help');await c.notifier.tick();
 let team=c.store.getEvent('Event').teams[0];c.store.editNote(c.session,'Event',{teamId:c.teamId,noteId:note.noteId,revision:team.revision,patch:{status:'Done'}});await c.notifier.tick();
 let patches=c.calls.filter(c=>c.options.method==='PATCH');expect(patches).toHaveLength(1);let body=JSON.parse(patches[0].options.body);
 expect(body.content).toBe('');expect(body.allowed_mentions).toEqual({parse:[]});expect(body.embeds[0].fields[1].value).toBe('Done');expect(body.components[1].components[2].disabled).toBe(true);expect(body.components[1].components[0].disabled).toBe(false);
 c.discord.mentorStatus(statusPayload(c,note.noteId,'done','todo'),controls);await c.notifier.tick();await c.notifier.tick();
 patches=c.calls.filter(c=>c.options.method==='PATCH');expect(patches).toHaveLength(2);expect(patches.every(p=>p.url.endsWith('/messages/723456789012345678'))).toBe(true);expect(c.calls.filter(c=>c.options.method==='POST')).toHaveLength(1);
 team=c.store.getEvent('Event').teams[0];c.store.deleteNote(c.session,'Event',{teamId:c.teamId,noteId:note.noteId,revision:team.revision});await c.notifier.tick();
 body=JSON.parse(c.calls.filter(c=>c.options.method==='PATCH').at(-1).options.body);expect(body.embeds[0].fields[1].value).toBe('Neaktivní');expect(body.components[1].components.every(b=>b.disabled)).toBe(true);
});
test('card updates retry safely with bounded backoff, survive restart, preserve newer edits and do no idle Discord calls',async()=>{
 const c=await setup(),note=c.discord.help(c.payload(),'Help');await c.notifier.tick();
 c.discord.mentorStatus(statusPayload(c,note.noteId),controls);
 let fail=true;c.setPost(async()=>fail?{ok:false,status:429,json:async()=>({retry_after:5})}:{ok:true,status:200,json:async()=>({id:'723456789012345678'})});
 await c.notifier.tick();c.advance(4000);await c.notifier.tick();expect(c.calls.filter(c=>c.options.method==='PATCH')).toHaveLength(1);
 c.advance(1100);fail=false;await new MentorNotifier(c.store,c.options).tick();expect(c.calls.filter(c=>c.options.method==='PATCH')).toHaveLength(2);
 const count=c.calls.length;await c.notifier.tick();expect(c.calls.length).toBe(count);
 c.discord.mentorStatus(statusPayload(c,note.noteId,'done','progress'),controls);
 // Change again while the PATCH is in flight: the later value must remain dirty.
 c.setPost(async()=>{c.store.db.query("UPDATE notes SET status='To Do' WHERE id=?").run(note.noteId);return {ok:true,status:200};});await c.notifier.tick();
 c.setPost(async()=>({ok:true,status:200}));await c.notifier.tick();expect(JSON.parse(c.calls.at(-1).options.body).embeds[0].fields[1].value).toBe('To Do');
 const d=await setup(),dn=d.discord.help(d.payload(),'Help');await d.notifier.tick();d.discord.mentorStatus(statusPayload(d,dn.noteId),controls);d.setPost(async()=>{throw new Error('private-token');});for(let i=0;i<5;i++){await d.notifier.tick();d.advance(60001);}expect(d.calls.filter(c=>c.options.method==='PATCH')).toHaveLength(3);expect(d.rows()[0].last_error).not.toContain('private-token');
});

test('schema 10 upgrade preserves delivered message bindings and does not create replacement announcements',async()=>{
 const dir=mkdtempSync('/tmp/dashhack-status-migration-');dirs.push(dir);const c=await setup(dir+'/app.sqlite');const note=c.discord.help(c.payload(),'Existing request');await c.notifier.tick();const before=c.store.getEvent('Event');
 for(const column of ['channel_id','sync_hash','sync_target','sync_attempts','sync_after'])c.store.db.exec(`ALTER TABLE discord_notifications DROP COLUMN ${column}`);
 c.store.db.exec('PRAGMA user_version=10');c.store.close();const reopened=new SqliteStore(dir+'/app.sqlite',{now:()=>1800000000000});stores.push(reopened);
 expect(reopened.getEvent('Event')).toEqual(before);expect(reopened.getSession(c.session).eventId).toBe(c.eventId);
 const row=reopened.db.query('SELECT * FROM discord_notifications WHERE note_id=?').get(note.noteId);expect(row.state).toBe('sent');expect(row.message_id).toBe('723456789012345678');expect(row.sync_hash).toBe('');
 await new MentorNotifier(reopened,c.options).tick();expect(c.calls.filter(c=>c.options.method==='POST')).toHaveLength(1);expect(c.calls.filter(c=>c.options.method==='PATCH')).toHaveLength(1);
});
