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
describe('Reusable team invitation links',()=>{
 test('event owners issue a repository-bound expiring link, absent from public event data',async()=>{
  const c=await fixture();expect(()=>c.invites.issue(null,'Event')).toThrow('expired');
  const other=await c.store.createEvent('Other','password123');expect(()=>c.invites.issue(c.store.createSession(other),'Event')).toThrow('permission');
  const issued=c.invites.issue(c.session,'Event'),url=new URL(issued.links[0].url),token=url.hash.slice(1);
  expect(url.pathname).toBe('/join');expect(url.search).toBe('');
  expect(c.invites.resolve(token)).toMatchObject({teamId:c.teamId,name:'505',repository:'school/505',installationId:123});
  expect(JSON.stringify(publicEvent(c.store.getEvent('Event')))).not.toContain(token);
  expect(()=>c.invites.resolve(token.slice(0,-1)+(token.endsWith('a')?'b':'a'))).toThrow('invalid');
  const parts=token.split('.');parts[0]=Buffer.from(JSON.stringify({teamId:c.teamId,repository:'school/other',expiresAt:issued.expiresAt})).toString('base64url');expect(()=>c.invites.resolve(parts.join('.'))).toThrow('invalid');
  expect(()=>new TeamInvites(c.store,c.app,'another-secret-key-1234567890123456').resolve(token)).toThrow('invalid');
  c.setNow(issued.expiresAt);expect(()=>c.invites.resolve(token)).toThrow('expired');
 });
 test('repository changes, disconnection and deletion invalidate existing links',async()=>{
  const c=await fixture(),token=new URL(c.invites.issue(c.session,'Event').links[0].url).hash.slice(1);
  c.store.db.query('UPDATE teams SET github=? WHERE id=?').run('https://github.com/school/other',c.teamId);expect(()=>c.invites.resolve(token)).toThrow('changed');
  c.store.db.query('UPDATE teams SET github=? WHERE id=?').run('https://github.com/school/505',c.teamId);
  c.store.disconnectGitHub(c.session,'Event');expect(()=>c.invites.resolve(token)).toThrow('changed');
  c.store.deleteTeam(c.session,'Event',{teamId:c.teamId});expect(()=>c.invites.resolve(token)).toThrow('no longer');
 });
 test('unconnected or foreign repositories cannot generate access links',async()=>{
  const c=await fixture();c.store.db.query('UPDATE teams SET github=? WHERE id=?').run('https://github.com/another-org/repo',c.teamId);
  expect(c.invites.issue(c.session,'Event').links[0].error).toContain('outside');
  c.store.disconnectGitHub(c.session,'Event');expect(()=>c.invites.issue(c.session,'Event')).toThrow('Connect');
  expect(()=>new TeamInvites(c.store,c.app,'').resolve('bad')).toThrow('not enabled');
 });
 test('admission bounds duplicate/in-flight requests and per-user attempts, then recovers',()=>{
  let now=0;const gate=new TeamInviteGate({now:()=>now});
  const release=gate.enter('team','Student','school-network');expect(()=>gate.enter('team','student','school-network')).toThrow('processed');release();gate.enter('team','student','school-network')();
  expect(()=>gate.enter('team','student','school-network')).toThrow('Too many');
  const held=['a','b','c','d'].map(name=>gate.enter('team',name,'school-network'));expect(()=>gate.enter('team','e','school-network')).toThrow('processed');held.forEach(release=>release());
  now=600001;gate.enter('team','student','school-network')();expect(gate.running.size).toBe(0);
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
