import {test,expect} from '@playwright/test';
import {generateKeyPairSync,sign,randomUUID,randomBytes} from 'node:crypto';
const keys=generateKeyPairSync('ed25519');
const publicKey=keys.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex');
let sequence=600000000000000000n+BigInt('0x'+randomBytes(7).toString('hex')); 
async function setup(request){
 const event=`discord-${randomUUID()}`,applicationId=String(sequence++),guildId=String(sequence++),channelId=String(sequence++);
 expect((await (await request.post('/api/auth/create',{data:{username:event,password:'password123'}})).json()).status).toBe(200);
 expect((await (await request.post('/api/auth/login',{data:{username:event,password:'password123'}})).json()).status).toBe(200);
 const teamId=(await (await request.post('/api/team/add',{data:{username:event,teamName:'Discord Team',teamColor:'#1565c0'}})).json()).teamId;
 const otherId=(await (await request.post('/api/team/add',{data:{username:event,teamName:'Other Team',teamColor:'#E53935'}})).json()).teamId;
 const config={applicationId,guildId,publicKey,channels:{[teamId]:channelId},enabled:true,revision:0};
 expect((await (await request.post('/api/discord/settings',{data:{event,config}})).json()).status).toBe(200);
 const payload=(extra={})=>({id:String(sequence++),application_id:applicationId,guild_id:guildId,channel_id:channelId,member:{user:{id:'423456789012345678',username:'Student Verified'}},type:2,data:{name:'matice'},...extra});
 async function send(body,tamper=false){const raw=JSON.stringify(body),timestamp=String(Math.floor(Date.now()/1000));const signature=sign(null,Buffer.from(timestamp+raw),keys.privateKey).toString('hex');return request.post('/api/discord/interactions',{data:tamper?raw+' ':raw,headers:{'Content-Type':'application/json','X-Signature-Ed25519':signature,'X-Signature-Timestamp':timestamp}});}
 return {event,config,teamId,otherId,payload,send};
}
test('signed Discord HTTP requests verify PING, reject forgery and create only one scoped mentor request',async({request,browser})=>{
 const c=await setup(request);
 expect(await (await c.send({type:1,application_id:c.config.applicationId})).json()).toEqual({type:1});
 expect((await c.send(c.payload(),true)).status()).toBe(401);
 expect((await request.post('/api/discord/interactions',{data:null})).status()).toBeGreaterThanOrEqual(400);
 const modal=await (await c.send(c.payload({data:{name:'mentor',options:[{name:'urgent',value:true}]}}))).json();expect(modal.type).toBe(9);
 const submit=c.payload({type:5,data:{custom_id:modal.data.custom_id,components:[{type:18,component:{type:4,custom_id:'request',value:'Pomoc s nasazením'}}]}});
 for(let i=0;i<2;i++){const reply=await (await c.send(submit)).json();expect(reply.data.flags).toBe(64);expect(reply.data.content).toContain('Kanbanu');}
 const event=(await (await request.get(`/api/event/${c.event}`)).json()).data;
 expect(event.teams.find(t=>t._id===c.teamId).stickyNotes).toHaveLength(1);expect(event.teams.find(t=>t._id===c.teamId).stickyNotes[0]).toMatchObject({priority:'high',type:'help_request',inKanban:true});expect(event.teams.find(t=>t._id===c.otherId).stickyNotes).toHaveLength(0);
 const denied=await (await c.send(c.payload({channel_id:'999999999999999999'}))).json();expect(denied.data.content).toContain('nemá přiřazený');
 const guest=await browser.newContext();try{expect((await (await guest.request.get(`/api/discord/settings?event=${c.event}`)).json()).status).toBe(401);}finally{await guest.close();}
});
test('student matrix link works on phone, strips secret, saves partial answers and preserves conflict drafts',async({request,browser,baseURL})=>{
 const c=await setup(request),reply=await (await c.send(c.payload())).json(),url=reply.data.components[0].components[0].url;
 expect(reply.data.flags).toBe(64);
 const student=await browser.newContext({viewport:{width:390,height:844}}),page=await student.newPage();
 try{
 await page.goto(url);await expect(page.getByRole('heading',{name:'Startupová matice'})).toBeVisible();await expect(page.getByText('Discord Team',{exact:true})).toBeVisible();expect(new URL(page.url()).hash).toBe('');
 expect((await student.cookies()).find(c=>c.name==='discordMatrixSession')?.httpOnly).toBe(true);
 await expect(page.getByRole('textbox',{name:'PROBLÉM',exact:true})).toBeVisible();await page.getByRole('textbox',{name:'PROBLÉM',exact:true}).fill('x'.repeat(601));await expect(page.getByRole('button',{name:'Uložit odpovědi',exact:true})).toBeDisabled();await expect(page.getByText('601/600',{exact:false})).toBeVisible();
 const tooLong=await student.request.patch('/api/discord/matrix',{data:{revision:0,answers:{problem:[{type:'paragraph',runs:[{text:'x'.repeat(601)}]}]}}});expect((await tooLong.json()).status).toBe(400);
 await page.getByRole('textbox',{name:'PROBLÉM',exact:true}).fill('Studentská odpověď');await page.getByRole('button',{name:'Uložit odpovědi',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Odpovědi uloženy.');
 await page.reload();await expect(page.getByRole('textbox',{name:'PROBLÉM',exact:true})).toHaveText('Studentská odpověď');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const event=(await (await request.get(`/api/event/${c.event}`)).json()).data,team=event.teams.find(t=>t._id===c.teamId);
 expect(team.startupMatrix.problem[0].runs[0].text).toBe('Studentská odpověď');expect(event.teams.find(t=>t._id===c.otherId).startupMatrix).toEqual({});
 await page.getByRole('textbox',{name:'PROBLÉM',exact:true}).fill('Zachovaný koncept');
 expect((await (await request.patch('/api/team/matrix',{data:{username:c.event,teamId:c.teamId,revision:team.revision,answers:{solution:[{type:'paragraph',runs:[{text:'Mentor edit'}]}]}}})).json()).status).toBe(200);
 await page.getByRole('button',{name:'Uložit odpovědi',exact:true}).click();await expect(page.getByRole('alert')).toContainText('mezitím');await expect(page.getByRole('textbox',{name:'PROBLÉM',exact:true})).toHaveText('Zachovaný koncept');
 await page.getByRole('button',{name:'Zahodit změny a načíst aktuální'}).click();await expect(page.getByRole('textbox',{name:'ŘEŠENÍ',exact:true})).toHaveText('Mentor edit');
 expect((await (await student.request.post('/api/team/add',{data:{username:c.event,teamName:'Forbidden'}})).json()).status).toBe(401);
 const stolen=await browser.newContext();try{const p=await stolen.newPage();await p.goto(url);await expect(p.getByRole('alert')).toBeVisible();await expect(p.getByRole('textbox',{name:'PROBLÉM',exact:true})).toHaveCount(0);}finally{await stolen.close();}
 }finally{await student.close();}
});
test('organizer setup renders channel mapping and keeps registration token transient',async({page})=>{
 const c=await setup(page.request);await page.goto(`/app/${c.event}/settings`);
 const panel=page.locator('#discord-app');await expect(panel.getByLabel('Application ID',{exact:true})).toHaveValue(c.config.applicationId);
 await panel.getByText('Kanály týmů (2)',{exact:true}).click();await expect(panel.getByLabel('Discord kanál: Discord Team',{exact:true})).toHaveValue(c.config.channels[c.teamId]);
 expect(new URL(await panel.getByRole('link',{name:'Nainstalovat příkazy do serveru'}).getAttribute('href')).searchParams.get('scope')).toBe('applications.commands');
 await page.route('**/api/discord/register',route=>route.fulfill({json:{status:200,message:'Příkazy registrovány.'}}));
 await panel.getByLabel('Discord bot token',{exact:true}).fill('synthetic-not-a-token');await panel.getByRole('button',{name:'Registrovat /mentor a /matice'}).click();await expect(panel.getByRole('status')).toHaveText('Příkazy registrovány.');await expect(panel.getByLabel('Discord bot token',{exact:true})).toHaveValue('');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
