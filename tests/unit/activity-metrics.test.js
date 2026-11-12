import {test,expect,afterEach} from 'bun:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqliteStore} from '../../src/server/storage/sqlite.js';
import {GitHubMetricsService} from '../../src/server/services/github-metrics.js';
const stores=[],dirs=[];
afterEach(()=>{for(const s of stores.splice(0))try{s.close();}catch{}for(const d of dirs.splice(0))rmSync(d,{recursive:true,force:true});});
async function fixture(path=':memory:'){
    let now=Date.parse('2026-11-12T12:30:00Z');const store=new SqliteStore(path,{now:()=>now});stores.push(store);
    const id=await store.createEvent('Event','password123'),session=store.createSession(id),input={teamName:'Team',teamColor:'#3081e0'},teamId=store.addTeam(session,'Event',input);
    return {store,id,session,teamId,input,now:()=>now,advance:n=>{now+=n;}};
}
test('history records atomic changes from both note paths, suppresses no-ops and rejects stale/foreign writes',async()=>{
    const c=await fixture(),note={id:'note',content:'Initial',status:'To Do',priority:'medium'};
    c.store.editTeam(c.session,'Event',{...c.input,teamId:c.teamId,revision:0,stickyNotes:[note]});
    let entries=c.store.activity(c.session,'Event',{teamId:c.teamId}).entries;expect(entries[0]).toMatchObject({kind:'note.created',actor:'Shared event login',entityId:'note',createdAt:'2026-11-12T12:30:00.000Z'});
    const count=entries.length;c.store.editTeam(c.session,'Event',{...c.input,teamId:c.teamId,revision:1,stickyNotes:[note]});expect(c.store.activity(c.session,'Event',{teamId:c.teamId}).entries).toHaveLength(count);
    c.store.editNote(c.session,'Event',{teamId:c.teamId,noteId:'note',revision:2,patch:{status:'Done',content:'Changed'}});
    expect(c.store.activity(c.session,'Event',{}).entries[0].details.changes).toContainEqual({field:'status',from:'To Do',to:'Done'});
    const current=c.store.activity(c.session,'Event',{}).entries.length;
    expect(()=>c.store.editNote(c.session,'Event',{teamId:c.teamId,noteId:'note',revision:2,patch:{status:'To Do'}})).toThrow('changed');expect(c.store.activity(c.session,'Event',{}).entries).toHaveLength(current);
    c.store.deleteNote(c.session,'Event',{teamId:c.teamId,noteId:'note',revision:3});expect(c.store.activity(c.session,'Event',{}).entries[0].kind).toBe('note.deleted');
    c.store.deleteTeam(c.session,'Event',{teamId:c.teamId});expect(c.store.activity(c.session,'Event',{teamId:c.teamId}).entries[0]).toMatchObject({kind:'team.deleted',teamName:'Team'});
    expect(()=>c.store.activity(null,'Event',{})).toThrow('expired');
    const other=await c.store.createEvent('Other','password123');expect(()=>c.store.activity(c.store.createSession(other),'Event',{})).toThrow('permission');
});
test('matrix/event history persists, paginates and never records credentials',async()=>{
    const c=await fixture();
    c.store.editStartupMatrix(c.session,'Event',{teamId:c.teamId,revision:0,answers:{problem:[{type:'paragraph',runs:[{text:'An answer'}]}]}});
    await c.store.updateSetting(c.session,'Event','githubToken','PRIVATE-TOKEN');
    const all=c.store.activity(c.session,'Event',{limit:100});expect(all.entries.some(e=>e.kind==='matrix.updated')).toBe(true);expect(JSON.stringify(all)).not.toContain('PRIVATE-TOKEN');expect(JSON.stringify(all)).not.toContain(c.session);
    const first=c.store.activity(c.session,'Event',{limit:2});expect(first.hasMore).toBe(true);const second=c.store.activity(c.session,'Event',{limit:2,before:first.entries.at(-1).id});expect(second.entries.every(e=>e.id<first.entries.at(-1).id)).toBe(true);
    const oldSession=c.session;await c.store.updateSetting(c.session,'Event','password','replacement-password','password123');expect(()=>c.store.activity(oldSession,'Event',{})).toThrow('expired');
    const fresh=c.store.createSession(c.id);expect(JSON.stringify(c.store.activity(fresh,'Event',{}))).not.toContain('replacement-password');
});
test('history includes all current notes, scopes team filters and only supplies recorded creation times',async()=>{
    const c=await fixture();
    c.store.editTeam(c.session,'Event',{...c.input,teamId:c.teamId,revision:0,stickyNotes:[{id:'plain',content:'Existing plain note',inKanban:false},{id:'tracked',content:'Help request',type:'help_request',inKanban:true}]});
    const second=c.store.addTeam(c.session,'Event',{teamName:'Second',teamColor:'#3081e0'});
    c.store.editTeam(c.session,'Event',{teamId:second,teamName:'Second',teamColor:'#3081e0',revision:0,stickyNotes:[{id:'other',content:'Other team'}]});
    expect(c.store.activity(c.session,'Event',{}).notes).toHaveLength(3);
    const result=c.store.activity(c.session,'Event',{teamId:c.teamId});expect(result.notes).toHaveLength(2);expect(result.notes[0]).toMatchObject({id:'plain',inKanban:false,createdAt:'2026-11-12T12:30:00.000Z'});
    c.store.db.query("DELETE FROM activity_log WHERE entity_id='plain' AND kind='note.created'").run();expect(c.store.activity(c.session,'Event',{}).notes.find(n=>n.id==='plain').createdAt).toBeNull();
    expect(c.store.activity(c.session,'Event',{before:result.entries.at(-1).id}).notes).toBeUndefined();
    expect(c.store.activity(c.session,'Event',{teamId:'foreign'}).notes).toEqual([]);
    expect(c.store.addWorknote).toBeUndefined();
});
test('schema 16 migration preserves populated data and sessions without inventing old history',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'dashhack-history-'));dirs.push(dir);const path=join(dir,'app.sqlite'),c=await fixture(path);
    const before=c.store.getEvent('Event');c.store.db.exec('DROP TABLE activity_log; DROP TABLE github_metrics_cache; PRAGMA user_version=16');c.store.close();
    const reopened=new SqliteStore(path,{now:c.now});stores.push(reopened);expect(reopened.getEvent('Event')).toEqual(before);expect(reopened.getSession(c.session).eventId).toBe(c.id);expect(reopened.activity(c.session,'Event',{}).entries).toEqual([]);expect(reopened.db.query('PRAGMA user_version').get().user_version).toBe(17);expect(reopened.db.query('PRAGMA integrity_check').get().integrity_check).toBe('ok');
});
test('event history retention is bounded and independent between events',async()=>{
    const c=await fixture(),other=await c.store.createEvent('Other','password123');
    for(let i=0;i<10005;i++)c.store.recordActivity(c.id,{kind:'note.updated',details:{content:'Entry '+i}});
    expect(c.store.db.query('SELECT COUNT(*) n FROM activity_log WHERE event_id=?').get(c.id).n).toBe(10000);
    expect(c.store.db.query('SELECT COUNT(*) n FROM activity_log WHERE event_id=?').get(other).n).toBe(1);
    expect(c.store.activity(c.session,'Event',{}).entries[0].details.content).toBe('Entry 10004');
});
const json=(value,headers={})=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json',...headers}});
const sha=n=>String(n).padStart(40,'0');
const commit=(n,date='2026-11-12T12:10:00Z')=>({sha:sha(n),commit:{committer:{date},author:{name:'Student',email:'never-persist@example.com'}},author:{id:1}});
test('persistent metrics coalesce, revalidate with ETags and fetch only previously unseen commit details',async()=>{
    const c=await fixture(),calls=[];let version=1;
    const request=async(url,options)=>{calls.push({url,headers:options.headers});if(url.includes('?')){if(options.headers['If-None-Match']==='"v1"'&&version===1)return new Response(null,{status:304});return json(version===1?[commit(1)]:[commit(2),commit(1)],{etag:`"v${version}"`});}return json({stats:{additions:10,deletions:2,total:12},files:[{patch:'NEVER CACHE SOURCE'}]});};
    const ctx={eventId:c.id,repository:'org/repo',scope:'scope',token:'PRIVATE-TOKEN'},service=new GitHubMetricsService(c.store,{request,now:c.now});
    const [a,b]=await Promise.all([service.get(ctx),service.get(ctx)]);expect(a).toEqual(b);expect(calls).toHaveLength(2);expect(a.commits.reduce((n,x)=>n+x,0)).toBe(1);expect(a.additions).toBe(10);
    expect((await service.get(ctx)).cached).toBe(true);expect(calls).toHaveLength(2);
    c.advance(121000);expect((await new GitHubMetricsService(c.store,{request,now:c.now}).get(ctx)).reqs).toBe(1);expect(calls[2].headers['If-None-Match']).toBe('"v1"');
    version=2;c.advance(121000);const updated=await service.get(ctx);expect(updated.reqs).toBe(2);expect(updated.commits.reduce((n,x)=>n+x,0)).toBe(2);expect(calls.filter(c=>c.url.endsWith(sha(1)))).toHaveLength(1);
    const raw=c.store.db.query('SELECT data FROM github_metrics_cache').get().data;expect(raw).not.toContain('PRIVATE-TOKEN');expect(raw).not.toContain('NEVER CACHE SOURCE');expect(raw).not.toContain('@example.com');
    c.advance(121000);await service.get({...ctx,scope:'changed-installation'});expect(calls.filter(c=>c.url.endsWith(sha(1)))).toHaveLength(2);
});
test('metrics paginate, keep partial counts explicit, bound detail work and expire commits across hour changes',async()=>{
    const c=await fixture();let lists=0,details=0;
    const service=new GitHubMetricsService(c.store,{now:c.now,request:async url=>{if(url.includes('?')){lists++;return new URL(url).searchParams.get('page')==='1'?json(Array.from({length:21},(_,i)=>commit(i+1)),{link:'<https://api.github.com/repos/org/repo/commits?page=2>; rel="next"'}):json([commit(22)]);}details++;return json({stats:{additions:1,deletions:0,total:1}});}});
    const ctx={eventId:c.id,repository:'org/repo',scope:'scope',token:'token'},first=await service.get(ctx);expect(lists).toBe(2);expect(details).toBe(20);expect(first.partial).toBe(true);expect(first.pendingDetails).toBe(2);
    c.advance(121000);const next=await service.get(ctx);expect(details).toBe(22);expect(next.partial).toBe(false);expect(next.contributors).toBe(1);
    c.advance(24*3600000);expect((await service.get(ctx)).commits.reduce((n,x)=>n+x,0)).toBe(0);
});
test('provider failures remain visible with backoff; revoked access fails closed instead of serving old success',async()=>{
    const c=await fixture();let failure=0,calls=0;
    const service=new GitHubMetricsService(c.store,{now:c.now,request:async url=>{calls++;if(failure)return new Response(null,{status:failure,headers:failure===429?{'retry-after':'300'}:{}});return url.includes('?')?json([commit(1)]):json({stats:{additions:1,deletions:0,total:1}});}});
    const ctx={eventId:c.id,repository:'org/repo',scope:'scope',token:'token'};await service.get(ctx);c.advance(121000);failure=429;const limited=await service.get(ctx);expect(limited.stale).toBe(true);expect(limited.warning).toContain('rate limit');const n=calls;await service.get(ctx);expect(calls).toBe(n);
    c.advance(301000);failure=403;const denied=await service.get(ctx);expect(denied.status).toBe(403);expect(denied.commits).toBeUndefined();expect((await service.get(ctx)).status).toBe(403);
});
