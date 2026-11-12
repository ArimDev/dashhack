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
test('Teams has three stretched cards per desktop row with working graph and History links',async({page})=>{
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
    await cards.first().getByRole('link',{name:'History',exact:true}).click();await expect(page).toHaveURL(new RegExp('history\\?team='+c.event.teams[0]._id));await expect(page.getByLabel('Team history',{exact:true})).toHaveValue(c.event.teams[0]._id);
});
test('metric browser cache is event-scoped and stale provider errors stay visible',async({page})=>{
    const a=await setup(page,1);let calls=0;await page.route('**/api/github/series?**',route=>{calls++;return route.fulfill({json:{...metrics(),stale:true,warning:'GitHub rate limit reached. Cached data will retry later.'}});});
    await page.goto(a.path+'/github-metrics#metrics-'+a.event.teams[0]._id);await expect(page.getByRole('status')).toContainText('rate limit');await expect(page.locator('.apexcharts-canvas')).toHaveCount(2);
    const b=await setup(page,1);await page.goto(b.path+'/github-metrics#metrics-'+b.event.teams[0]._id);await expect(page.locator('.apexcharts-canvas')).toHaveCount(2);expect(calls).toBe(2);
});
test('History gathers all notes and changes, filters teams and has no manual creation flow',async({page,browser})=>{
    const c=await setup(page,2),team=c.event.teams[0],noteId=randomUUID(),plainId=randomUUID(),otherId=randomUUID();
    for(const [index,notes] of [[0,[{id:noteId,content:'Need a mentor',type:'help_request',inKanban:true,status:'To Do'},{id:plainId,content:'Plain note <script>escaped</script>',type:'mentor_note',inKanban:false}]],[1,[{id:otherId,content:'Other team note',inKanban:false}]]] as const){
        const t=c.event.teams[index];expect((await(await page.request.put('/api/team/edit',{data:{username:c.name,teamId:t._id,revision:0,teamName:t.name,teamColor:t.color,teamGithub:t.github,stickyNotes:notes}})).json()).status).toBe(200);
    }
    expect((await(await page.request.patch('/api/note/edit',{data:{username:c.name,teamId:team._id,noteId,revision:1,patch:{status:'In Progress'}}})).json()).status).toBe(200);
    await page.goto(c.path+'/log?team='+team._id);await expect(page).toHaveURL(url=>url.pathname.endsWith('/history')&&url.searchParams.get('team')===team._id);
    await expect(page.getByRole('heading',{name:'History',exact:true,level:1})).toBeVisible();await expect(page.getByRole('textbox')).toHaveCount(0);await expect(page.getByRole('button',{name:'Add worknote'})).toHaveCount(0);
    await expect(page.getByTestId('history-note-'+noteId)).toContainText('In Progress');await expect(page.getByTestId('history-note-'+plainId)).toContainText('Plain note <script>escaped</script>');await expect(page.getByTestId('history-note-'+otherId)).toHaveCount(0);
    await expect(page.getByTestId('activity-note.updated')).toContainText('To Do → In Progress');await expect(page.getByTestId('activity-note.updated')).toContainText('Shared event login');
    await page.getByLabel('Team history',{exact:true}).selectOption('');await expect(page.locator('[data-testid^="history-note-"]')).toHaveCount(3);
    await page.getByLabel('Team history',{exact:true}).selectOption(c.event.teams[1]._id);await expect(page.locator('[data-testid^="history-note-"]')).toHaveCount(1);await expect(page.getByTestId('history-note-'+otherId)).toContainText('Other team note');
    const before=(await(await page.request.get('/api/activity?event='+c.name)).json()).entries;
    expect((await(await page.request.post('/api/activity',{data:{event:c.name,content:'Do not add'}})).json()).status).toBe(405);expect((await(await page.request.get('/api/activity?event='+c.name)).json()).entries).toEqual(before);
    await page.goto(c.path+'/worknotes?team='+team._id);await expect(page).toHaveURL(url=>url.pathname.endsWith('/history')&&url.searchParams.get('team')===team._id);
    await page.setViewportSize({width:390,height:844});await expect(page.getByTestId('history-note-'+plainId)).toBeVisible();expect(await page.locator('#dashboard-content').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    const guest=await browser.newContext({ignoreHTTPSErrors:true}),view=await guest.newPage();await view.goto(new URL(c.path+'/history',page.url()).href);await expect(view.getByText('Log in to this event to view history.')).toBeVisible();expect((await(await guest.request.get(new URL('/api/activity?event='+c.name,page.url()).href)).json()).status).toBe(401);await guest.close();
});
test('History paginates automatic changes without dropping the current notes list',async({page})=>{
    const c=await setup(page,1),team=c.event.teams[0],noteId=randomUUID();
    expect((await(await page.request.put('/api/team/edit',{data:{username:c.name,teamId:team._id,revision:0,teamName:team.name,teamColor:team.color,stickyNotes:[{id:noteId,content:'Initial'}]}})).json()).status).toBe(200);
    for(let i=0;i<35;i++)expect((await(await page.request.patch('/api/note/edit',{data:{username:c.name,teamId:team._id,noteId,revision:i+1,patch:{content:'Progress '+i}}})).json()).status).toBe(200);
    await page.goto(c.path+'/history?team='+team._id);await expect(page.locator('[data-testid^="activity-"]')).toHaveCount(30);await expect(page.getByTestId('history-note-'+noteId)).toContainText('Progress 34');await page.getByRole('button',{name:'Load older entries'}).click();await expect(page.getByTestId('activity-note.updated')).toHaveCount(35);await expect(page.getByTestId('history-note-'+noteId)).toContainText('Progress 34');
});
