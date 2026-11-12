import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
async function setup(page,count=3){
    const name='Worknotes-'+randomUUID(),password='password123';
    for(const action of ['create','login'])expect((await(await page.request.post('/api/auth/'+action,{data:{username:name,password}})).json()).status).toBe(200);
    for(let i=0;i<count;i++)expect((await(await page.request.post('/api/team/add',{data:{username:name,teamName:'Team '+i,teamColor:'#3081e0',teamGithub:'https://github.com/mock/repo',teamOriginality:i===1?'Tall project description. '.repeat(60):''}})).json()).status).toBe(200);
    const event=(await(await page.request.get('/api/event/'+name)).json()).data;
    return {name,path:'/app/'+name,event};
}
const metrics=()=>({status:200,commits:[1,2,0],diff:[10,20,0],hours:['2026-11-12T12:00:00Z','2026-11-12T11:00:00Z','2026-11-12T10:00:00Z'],additions:22,deletions:8,contributors:2,checkedAt:new Date().toISOString(),nextCheckAt:new Date(Date.now()+120000).toISOString()});
test('Teams has three stretched cards per desktop row with working graph and Worknotes links',async({page})=>{
    const c=await setup(page);let requests=0;await page.route('**/api/github/series?**',route=>{requests++;return route.fulfill({json:metrics()});});
    await page.setViewportSize({width:1920,height:1080});await page.goto(c.path+'/teams');expect(requests).toBe(0);
    const cards=page.locator('[data-testid^="team-card-"]');
    for(const width of [1920,1280,1024]){
        await page.setViewportSize({width,height:1080});
        await expect.poll(()=>page.getByTestId('teams-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3);
        const boxes=await cards.evaluateAll(elements=>elements.map(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height,bottom:el.getBoundingClientRect().bottom})));
        expect(Math.max(...boxes.map(b=>b.top))-Math.min(...boxes.map(b=>b.top))).toBeLessThan(2);expect(Math.max(...boxes.map(b=>b.height))-Math.min(...boxes.map(b=>b.height))).toBeLessThan(2);
    }
    await cards.first().getByRole('link',{name:'GitHub metrics',exact:true}).click();await expect(page).toHaveURL(/github-metrics#metrics-/);await expect(page.locator('.apexcharts-canvas')).toHaveCount(2);await expect(page.getByText('Lines added',{exact:true})).toBeVisible();expect(requests).toBe(1);
    await page.getByRole('button',{name:'Refresh metrics'}).click();expect(requests).toBe(1);
    await page.setViewportSize({width:390,height:844});expect(await page.locator('#dashboard-content').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    await page.goto(c.path+'/teams');await expect.poll(()=>page.getByTestId('teams-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    await cards.first().getByRole('link',{name:'Worknotes & history',exact:true}).click();await expect(page).toHaveURL(new RegExp('worknotes\\?team='+c.event.teams[0]._id));await expect(page.getByLabel('Team history',{exact:true})).toHaveValue(c.event.teams[0]._id);
});
test('Worknotes shows actual note/status history, manual updates, correct team filters and private access',async({page,browser})=>{
    const c=await setup(page,2),team=c.event.teams[0],noteId=randomUUID();
    expect((await(await page.request.put('/api/team/edit',{data:{username:c.name,teamId:team._id,revision:0,teamName:team.name,teamColor:team.color,teamGithub:team.github,stickyNotes:[{id:noteId,content:'Need a mentor',type:'help_request',inKanban:true,priority:'high',status:'To Do'}]}})).json()).status).toBe(200);
    expect((await(await page.request.patch('/api/note/edit',{data:{username:c.name,teamId:team._id,noteId,revision:1,patch:{status:'In Progress'}}})).json()).status).toBe(200);
    await page.goto(c.path+'/log?team='+team._id);await expect(page).toHaveURL(new RegExp('worknotes\\?team='+team._id));
    await expect(page.getByTestId('activity-note.updated')).toContainText('To Do → In Progress');await expect(page.getByTestId('activity-note.updated')).toContainText('Shared event login');await expect(page.getByTestId('activity-note.updated').locator('time')).toHaveAttribute('datetime',/T.*Z$/);
    await page.getByLabel('Worknote',{exact:true}).fill('Mentor helped <script>alert(1)</script>. Next: test the prototype.');await page.getByRole('button',{name:'Add worknote',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Worknote added.');await expect(page.getByTestId('activity-worknote.added')).toContainText('<script>alert(1)</script>');
    await page.reload();await expect(page.getByTestId('activity-worknote.added')).toContainText('Mentor helped');
    await page.getByLabel('Team history',{exact:true}).selectOption(c.event.teams[1]._id);await expect(page.getByTestId('activity-worknote.added')).toHaveCount(0);await expect(page.getByTestId('activity-team.created')).toContainText('Team 1');
    await page.getByLabel('Team history',{exact:true}).selectOption(team._id);await expect(page.getByTestId('activity-worknote.added')).toBeVisible();
    await page.getByTestId('activity-worknote.added').getByRole('link',{name:'Open team',exact:true}).click();await expect(page).toHaveURL(/teams#team-/);await expect(page.locator(':focus')).toHaveAttribute('id','team-'+team._id);
    const guest=await browser.newContext({ignoreHTTPSErrors:true}),view=await guest.newPage();await view.goto(new URL(c.path+'/worknotes',page.url()).href);await expect(view.getByText('Log in to this event to view or add worknotes and history.')).toBeVisible();expect((await(await guest.request.get(new URL('/api/activity?event='+c.name,page.url()).href)).json()).status).toBe(401);
    const other='Other-'+randomUUID();for(const action of ['create','login'])await guest.request.post(new URL('/api/auth/'+action,page.url()).href,{data:{username:other,password:'password123'}});expect((await(await guest.request.get(new URL('/api/activity?event='+c.name,page.url()).href)).json()).status).toBe(403);await guest.close();
});
test('metric browser cache is event-scoped and stale provider errors stay visible',async({page})=>{
    const a=await setup(page,1);let calls=0;await page.route('**/api/github/series?**',route=>{calls++;return route.fulfill({json:{...metrics(),stale:true,warning:'GitHub rate limit reached. Cached data will retry later.'}});});
    await page.goto(a.path+'/github-metrics#metrics-'+a.event.teams[0]._id);await expect(page.getByRole('status')).toContainText('rate limit');await expect(page.locator('.apexcharts-canvas')).toHaveCount(2);
    const b=await setup(page,1);await page.goto(b.path+'/github-metrics#metrics-'+b.event.teams[0]._id);await expect(page.locator('.apexcharts-canvas')).toHaveCount(2);expect(calls).toBe(2);
});
test('Worknotes paginates older entries and keeps a draft on save failure',async({page})=>{
    const c=await setup(page,1),teamId=c.event.teams[0]._id;
    for(let i=0;i<35;i++)expect((await(await page.request.post('/api/activity',{data:{event:c.name,teamId,content:'Progress '+i}})).json()).status).toBe(200);
    await page.goto(c.path+'/worknotes?team='+teamId);await expect(page.locator('[data-testid^="activity-"]')).toHaveCount(30);await page.getByRole('button',{name:'Load older entries'}).click();await expect(page.getByTestId('activity-worknote.added')).toHaveCount(35);
    await page.getByLabel('Worknote',{exact:true}).fill('Keep this unsaved update');await page.route('**/api/activity',route=>route.request().method()==='POST'?route.fulfill({json:{status:409,message:'Retry this update'}}):route.continue(),{times:1});
    await page.getByRole('button',{name:'Add worknote',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Retry this update');await expect(page.getByLabel('Worknote',{exact:true})).toHaveValue('Keep this unsaved update');
    await page.getByRole('button',{name:'Add worknote',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Worknote added.');await expect(page.getByLabel('Worknote',{exact:true})).toHaveValue('');await expect(page.getByTestId('activity-worknote.added').first()).toContainText('Keep this unsaved update');
});
