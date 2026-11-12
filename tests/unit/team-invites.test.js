import { afterEach, describe, test, expect } from 'bun:test';
import { SqliteStore, publicEvent } from '../../src/server/storage/sqlite.js';
import { GitHubAppService } from '../../src/server/services/github-app.js';
import { TeamInvites, TeamInviteGate } from '../../src/server/services/team-invites.js';
const stores=[]; afterEach(()=>stores.splice(0).forEach(store=>store.close()));
const config={githubAppId:'42',githubAppClientId:'client',githubAppClientSecret:'secret',githubAppPrivateKey:'pem',githubAppSlug:'test-app',githubAppBaseUrl:'https://dashhack.test'};
const key='private-invite-signing-key-12345678901234567890';
async function fixture(){
 let now=Date.now();const store=new SqliteStore(':memory:',{now:()=>now});stores.push(store);
 const eventId=await store.createEvent('Event','password123'),session=store.createSession(eventId);
 const teamId=store.addTeam(session,'Event',{teamName:'505',teamColor:'#FFD600',teamGithub:'https://github.com/school/505'});
 const flow=store.beginGitHubFlow(session,'Event',[{id:123,account:'school',type:'Organization'}]);store.connectGitHub(session,flow.id,123,'42');
 const app=new GitHubAppService(config),invites=new TeamInvites(store,app,key);
 return {store,app,invites,session,eventId,teamId,setNow:value=>{now=value}};
}
describe('Private reusable GitHub-verified team invitations',()=>{
 const browser='A'.repeat(43),ctx={ip:'127.0.0.1',userAgent:'Test browser',requestId:'request-1'};
 const first=c=>{const issued=c.invites.issue(c.session,'Event');return {...issued.links[0],token:new URL(issued.links[0].url).hash.slice(1)};};
 function userProvider(c){
  const calls=[];c.app.exchange=async(code,verifier)=>{calls.push(['exchange',code,verifier]);return 'temporary-user-token';};
  c.app.api=async(path,token)=>{expect(path).toBe('/user');expect(token).toBe('temporary-user-token');return {id:12345,login:'RealStudent',type:'User'};};
  c.app.revokeUserToken=async token=>{calls.push(['revoke',token]);};
  c.app.inviteCollaborator=async(id,repository,username)=>{calls.push(['invite',id,repository,username]);return {username,alreadyHasAccess:false,repositoryUrl:'https://github.com/'+repository};};
  return calls;
 }
 test('only event owners issue opaque, short-lived links; no raw secrets in DB/public data',async()=>{
  const c=await fixture();expect(()=>c.invites.issue(null,'Event')).toThrow('expired');
  const other=await c.store.createEvent('Other','password123');expect(()=>c.invites.issue(c.store.createSession(other),'Event')).toThrow('permission');
  const l=first(c);expect(l.token).toMatch(/^[a-f0-9-]{36}\.[a-f0-9]{64}$/);expect(l.expiresAt-c.store.now()).toBe(7*86400000);
  expect(c.invites.resolve(l.token)).toMatchObject({teamId:c.teamId,repository:'school/505'});
  expect(JSON.stringify(c.store.db.query('SELECT * FROM team_invite_links').all())).not.toContain(l.token);
  expect(JSON.stringify(publicEvent(c.store.getEvent('Event')))).not.toContain(l.token);
  expect(()=>c.invites.resolve(l.token+'x')).toThrow('invalid');
  expect(()=>new TeamInvites(c.store,c.app,'different-key-123456789012345678901234').resolve(l.token)).toThrow('invalid');
  expect(()=>c.invites.resolve('old.payload.signature')).toThrow('invalid');
  c.setNow(l.expiresAt);expect(()=>c.invites.resolve(l.token)).toThrow('expired');
 });
 test('OAuth is browser-bound, expires, cannot be replayed and only invites GitHub verified identity',async()=>{
  const c=await fixture(),l=first(c),calls=userProvider(c),flow=c.invites.begin(l.token,browser,ctx);
  await expect(c.invites.verify(flow.id,'B'.repeat(43),'code',ctx)).rejects.toThrow('expired');
  await expect(c.invites.claim(flow.id,browser,ctx)).rejects.toThrow('Sign in');
  const verified=await c.invites.verify(flow.id,browser,'code',ctx);expect(verified.username).toBe('RealStudent');
  expect(calls[0]).toEqual(['exchange','code',flow.verifier]);expect(calls[1]).toEqual(['revoke','temporary-user-token']);
  await expect(c.invites.verify(flow.id,browser,'code',ctx)).rejects.toThrow('already used');
  const result=await c.invites.claim(flow.id,browser,ctx);expect(result.username).toBe('RealStudent');
  expect(calls.filter(x=>x[0]==='invite')).toEqual([['invite',123,'school/505','RealStudent']]);
  expect(await c.invites.claim(flow.id,browser,ctx)).toEqual(result);expect(calls.filter(x=>x[0]==='invite')).toHaveLength(1);
  expect(c.invites.resolve(l.token).teamId).toBe(c.teamId);
  const log=c.invites.manage(c.session,'Event',{action:'list'}).audit;
  expect(log.some(e=>e.action==='claim' && e.outcome==='invitation_sent' && e.verified===1 && e.username==='RealStudent' && e.githubUserId==='12345' && e.ip===ctx.ip)).toBe(true);
  expect(JSON.stringify(log)).not.toContain('temporary-user-token');expect(JSON.stringify(log)).not.toContain(l.token);
 });
 test('one stable link serves multiple verified teammates and repeat issuance preserves it',async()=>{
  const c=await fixture(),l=first(c),calls=userProvider(c);
  expect(first(c).url).toBe(l.url);
  const a=c.invites.begin(l.token,browser);await c.invites.verify(a.id,browser,'a');await c.invites.claim(a.id,browser);
  c.app.api=async()=>({id:6789,login:'Teammate',type:'User'});
  const b=c.invites.begin(l.token,browser);await c.invites.verify(b.id,browser,'b');await c.invites.claim(b.id,browser);
  expect(calls.filter(x=>x[0]==='invite').map(x=>x[3])).toEqual(['RealStudent','Teammate']);
  expect(first(c).url).toBe(l.url);
 });
 test('revocation blocks existing OAuth flows, new claims and only the selected event',async()=>{
  const c=await fixture(),l=first(c);userProvider(c);const flow=c.invites.begin(l.token,browser,ctx);await c.invites.verify(flow.id,browser,'code',ctx);
  c.invites.manage(c.session,'Event',{action:'revoke',linkId:l.linkId});await expect(c.invites.claim(flow.id,browser,ctx)).rejects.toThrow('invalid');
  const l2=first(c);c.invites.manage(c.session,'Event',{action:'revokeAll'});expect(()=>c.invites.resolve(l2.token)).toThrow('invalid');
  expect(()=>c.invites.manage(null,'Event',{action:'list'})).toThrow('expired');
 });
 test('concurrent requests for one verified account grant once; provider failure leaves an audit',async()=>{
  const c=await fixture(),l=first(c);userProvider(c);const a=c.invites.begin(l.token,browser),b=c.invites.begin(l.token,browser);
  await c.invites.verify(a.id,browser,'a');await c.invites.verify(b.id,browser,'b');
  let release;const wait=new Promise(r=>{release=r;});let grants=0;c.app.inviteCollaborator=async()=>{grants++;await wait;throw new Error('timeout');};
  const claim=c.invites.claim(a.id,browser);await expect(c.invites.claim(b.id,browser)).rejects.toThrow('already being processed');release();await expect(claim).rejects.toThrow('timeout');
  expect(grants).toBe(1);expect(c.invites.resolve(l.token).teamId).toBe(c.teamId);
  expect(c.invites.manage(c.session,'Event',{action:'list'}).audit.some(e=>e.outcome==='provider_error')).toBe(true);
 });
 test('OAuth expiry, repository changes and team deletion block grants',async()=>{
  const c=await fixture(),l=first(c),flow=c.invites.begin(l.token,browser);userProvider(c);
  c.setNow(c.store.now()+600001);await expect(c.invites.verify(flow.id,browser,'code')).rejects.toThrow('expired');
  c.store.db.query('UPDATE teams SET github=? WHERE id=?').run('https://github.com/school/other',c.teamId);expect(()=>c.invites.resolve(l.token)).toThrow('changed');
  c.store.deleteTeam(c.session,'Event',{teamId:c.teamId});expect(()=>c.invites.resolve(l.token)).toThrow('invalid');
 });
 test('foreign repositories and rate bursts are rejected',async()=>{
  const c=await fixture();
  c.store.db.query('UPDATE teams SET github=? WHERE id=?').run('https://github.com/another/repo',c.teamId);expect(c.invites.issue(c.session,'Event').links[0].error).toContain('outside');
  expect(()=>new TeamInvites(c.store,c.app,'').resolve('bad')).toThrow('disabled');
  let now=0;const gate=new TeamInviteGate({now:()=>now});const held=['a','b','c','d'].map(x=>gate.enter('team',x,'network'));
  expect(()=>gate.enter('team','e','network')).toThrow('processed');held.forEach(r=>r());
  for(let i=0;i<300;i++)gate.enter('same','user','shared-school-ip')();expect(()=>gate.enter('same','user','shared-school-ip')).toThrow('Too many');
  now=600001;gate.enter('same','user','shared-school-ip')();
 });
 test('schema 7 upgrades preserve existing event and wall data',async()=>{
  const c=await fixture();expect(c.store.db.query('PRAGMA user_version').get().user_version).toBe(13);
  expect(c.store.getEvent('Event').teams[0]._id).toBe(c.teamId);
 });
});
const response=(value,status=200)=>new Response(status===204?null:JSON.stringify(value),{status});
describe('GitHub collaborator grants',()=>{
 function service({permission='none',admin='write',failInvite=false,updatedExisting=false,invitationUrl=undefined}={}){
  const calls=[];const app=new GitHubAppService(config,{request:async(url,options)=>{
   const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):undefined;calls.push({path,method:options.method,body,authorization:options.headers.Authorization});
   if(path==='/repos/school/505')return response({id:999});
   if(path==='/users/student')return response({login:'Student',type:'User'});
   if(path.endsWith('/permission'))return response({permission});
   if(path==='/app/installations/123')return response({permissions:{administration:admin}});
   if(path.endsWith('/access_tokens'))return response({token:'privileged-one-repo'});
   if(path==='/repos/school/505/collaborators/Student')return failInvite?response({},403):updatedExisting?response(null,204):response({id:100,html_url:invitationUrl});
   if(path==='/installation/token')return response(null,204);
   throw Error('Unexpected '+path);
  }});app.installationToken=async()=> 'read-only-token';app.jwt=()=> 'app-jwt';return {app,calls};
 }
 test('only one repository receives push permission; privileged token is revoked, not cached',async()=>{
  const {app,calls}=service();const result=await app.inviteCollaborator(123,'school/505','student');
  expect(result).toMatchObject({username:'Student',alreadyHasAccess:false,invitationUrl:'https://github.com/school/505/invitations'});
  expect(calls.find(call=>call.path.endsWith('/access_tokens')).body).toEqual({repository_ids:[999],permissions:{administration:'write',metadata:'read'}});
  expect(calls.find(call=>call.method==='PUT')).toMatchObject({path:'/repos/school/505/collaborators/Student',body:{permission:'push'},authorization:'Bearer privileged-one-repo'});
  expect(calls.at(-1)).toMatchObject({path:'/installation/token',method:'DELETE'});expect(app.tokens.size).toBe(0);
 });
 test('uses the provider invitation URL while rejecting unexpected destinations',async()=>{
  const url='https://github.com/school/505/invitations?invitation_id=100';
  expect((await service({invitationUrl:url}).app.inviteCollaborator(123,'school/505','student')).invitationUrl).toBe(url);
  for(const bad of ['https://example.com/invitations','https://github.com/other/repo/invitations','https://api.github.com/user/repository_invitations/100','not a URL']) {
   expect((await service({invitationUrl:bad}).app.inviteCollaborator(123,'school/505','student')).invitationUrl).toBe('https://github.com/school/505/invitations');
  }
 });
 test('a renamed or substituted username cannot invite a different account ID',async()=>{
  const {app,calls}=service();await expect(app.inviteCollaborator(123,'school/505','student','different-id')).rejects.toThrow('account changed');expect(calls.some(c=>c.method==='PUT')).toBe(false);
 });
 test('temporary user OAuth tokens are revoked with app credentials without revoking authorization',async()=>{
  let call;const app=new GitHubAppService(config,{request:async(url,options)=>{call={url,options};return response(null,204);}});
  await app.revokeUserToken('temporary-token');expect(new URL(call.url).pathname).toBe('/applications/client/token');expect(call.options.method).toBe('DELETE');expect(JSON.parse(call.options.body)).toEqual({access_token:'temporary-token'});
  expect(call.options.headers.Authorization).toBe('Basic '+Buffer.from('client:secret').toString('base64'));
 });
 test('upgrading an existing reader requires no invitation acceptance',async()=>{
  const {app}=service({permission:'read',updatedExisting:true});expect((await app.inviteCollaborator(123,'school/505','student')).alreadyHasAccess).toBe(true);
 });
 test('existing administrators are never downgraded or sent another invite',async()=>{
  const {app,calls}=service({permission:'admin'});expect((await app.inviteCollaborator(123,'school/505','student')).alreadyHasAccess).toBe(true);expect(calls.some(call=>call.method!=='GET')).toBe(false);
 });
 test('missing approval prevents minting/writes; failed grants still revoke their token',async()=>{
  const blocked=service({admin:'read'});await expect(blocked.app.inviteCollaborator(123,'school/505','student')).rejects.toThrow('Administration');expect(blocked.calls.some(call=>call.method!=='GET')).toBe(false);
  const failed=service({failInvite:true});await expect(failed.app.inviteCollaborator(123,'school/505','student')).rejects.toThrow('denied');expect(failed.calls.at(-1).method).toBe('DELETE');
  await expect(failed.app.inviteCollaborator(123,'school/505','../../other')).rejects.toThrow('username');
 });
});
