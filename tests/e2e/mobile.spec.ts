import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const password = 'password123';
async function demo(page) {
    const name = `Mobilní hackathon ${randomUUID()}`;
    for (const path of ['create','login']) expect((await (await page.request.post(`/api/auth/${path}`, { data: { username: name, password } })).json()).status).toBe(200);
    const encoded = encodeURIComponent(name), teamName = 'StudentskýProjekt' + 'DlouhýNázev'.repeat(10);
    expect((await (await page.request.post('/api/team/add', { data: { username: name, teamName, teamColor: '#3081e0', teamDescription: 'Mobilní studentský projekt s dlouhým popisem. '.repeat(8), teamOriginality: 'OriginálníNápad'.repeat(30) } })).json()).status).toBe(200);
    const event = (await (await page.request.get(`/api/event/${encoded}`)).json()).data;
    const team = event.teams[0];
    const notes = [{ id: randomUUID(), content: 'Pomoc s prototypem', type: 'help_request', inKanban: true, status: 'To Do' }];
    expect((await (await page.request.put('/api/team/edit', { data: { username: name, teamId: team._id, revision: team.revision, teamName, teamColor: team.color, stickyNotes: notes } })).json()).status).toBe(200);
    return { name, encoded, teamName, teamId: team._id, noteId: notes[0].id };
}
async function fits(page) {
    const size = await page.evaluate(() => ({ width: innerWidth, doc: document.documentElement.scrollWidth,
        main: document.querySelector('main') ? { width: document.querySelector('main').clientWidth, scroll: document.querySelector('main').scrollWidth } : null }));
    expect(size.doc, JSON.stringify(size)).toBeLessThanOrEqual(size.width + 1);
    if (size.main) expect(size.main.scroll, JSON.stringify(size)).toBeLessThanOrEqual(size.main.width + 1);
}
async function wall(page, encoded) {
    expect((await (await page.request.post(`/api/wall/${encoded}/posts`, { data: { action: 'updateSettings', settings: { enabled: true }, revision: 0 } })).json()).status).toBe(200);
    const post = (await (await page.request.post(`/api/wall/${encoded}`, { data: { text: 'Mobilní příspěvek s dlouhým textem. '.repeat(10) } })).json()).data;
    expect((await (await page.request.post(`/api/wall/${encoded}/posts`, { data: { action: 'approve', postId: post.id, revision: 0 } })).json()).status).toBe(200);
    return post;
}

test('all routes fit narrow phones, tablets and landscape with long event/team content', async ({ page }) => {
    test.setTimeout(120000);
    const d = await demo(page); await wall(page, d.encoded);
    const routes = ['/', ...['teams','kanban','mentors','settings','log','social-wall'].map(path => `/app/${d.encoded}/${path}`), `/${d.encoded}/wall`, `/${d.encoded}/wall/upload`, '/github/callback'];
    for (const viewport of [{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:812,height:375},{width:1024,height:768}]) {
        await page.setViewportSize(viewport);
        for (const path of routes) {
            await page.goto(path);
            if (path === '/') await expect(page.getByTestId('login-button')).toBeVisible();
            if (path.endsWith('/wall/upload')) await expect(page.getByRole('button',{name:'Submit for approval'})).toBeVisible();
            if (path === '/github/callback') await expect(page.getByRole('alert')).toBeVisible();
            if (path.startsWith('/app/')) await expect(page.locator('#dashboard-content')).toBeVisible();
            if (path.endsWith('/wall')) await expect(page.locator('article').first()).toBeVisible();
            await fits(page);
        }
    }
});

test('mobile navigation, keyboard-safe team dialogs, repository picker and note status edits work', async ({ page }) => {
    const d = await demo(page);
    await page.route(`**/api/event/${d.encoded}`, async route => { const response = await route.fetch(); const data = await response.json(); data.data.settings.githubApp = true; await route.fulfill({json:data}); });
    await page.route('**/api/github/rateLimit?*', route => route.fulfill({json:{status:200,rate:{remaining:4999}}}));
    await page.route('**/api/github/app/repositories?*', route => route.fulfill({json:{status:200,hasMore:false,repositories:[{id:1,name:'organisation/'+'very-long-repository-name-'.repeat(4),url:'https://github.com/demo/mobile',private:false}]}}));
    await page.goto(`/app/${d.encoded}/teams`);
    await page.getByTestId('add-team-fab').tap();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#__nuxt')).toHaveAttribute('inert','');
    await dialog.getByTestId('team-name-input').fill('Nový mobilní tým');
    await dialog.getByRole('button',{name:'Choose GitHub repository'}).tap();
    await dialog.getByRole('button',{name:/organisation\//}).tap();
    await expect(dialog.getByTestId('team-github-input')).toHaveValue('https://github.com/demo/mobile');
    await page.setViewportSize({width:812,height:375});
    const box = await dialog.boundingBox(); expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y+box.height).toBeLessThanOrEqual(375);
    await expect(dialog.getByTestId('submit-team-btn')).toBeInViewport();
    await dialog.getByTestId('submit-team-btn').tap();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('#__nuxt')).not.toHaveAttribute('inert');
    await page.setViewportSize({width:390,height:844});
    const card = page.getByTestId(`team-card-${d.teamName}`);
    await card.getByTestId('toggle-notes-btn').tap();
    const note=card.getByTestId('note-content');await note.fill('Upraveno z telefonu');
    const saved=page.waitForResponse(r=>r.url().includes('/api/team/edit') && r.request().method()==='PUT');await note.blur();expect((await (await saved).json()).status).toBe(200);
    await page.getByRole('navigation',{name:'Quick navigation'}).getByRole('link',{name:'Kanban',exact:true}).tap();
    const status=page.locator('[data-testid="kanban-column-To Do"]').getByLabel('Note status');
    const moved=page.waitForResponse(r=>r.url().includes('/api/note/edit'));await status.selectOption('In Progress');expect((await (await moved).json()).status).toBe(200);
    await page.getByRole('navigation',{name:'Kanban columns'}).getByRole('button',{name:/In Progress/}).tap();
    await expect(page.getByTestId(`kanban-note-${d.noteId}`).getByTestId('note-content')).toHaveValue('Upraveno z telefonu');
    await page.getByRole('button',{name:'More event pages'}).tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('link',{name:'Settings',exact:true}).tap();
    await expect(page.getByRole('heading',{name:'Event Password'})).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);await fits(page);
});

test('mobile rich text, mentor registration, matrix save and confirmation remain reachable',async ({page})=>{
    const d=await demo(page);await page.goto(`/app/${d.encoded}/mentors`);
    await page.getByLabel('Your name').fill('Mobilní mentorka');await page.getByRole('button',{name:'Add myself'}).tap();
    await expect(page.getByText('Mobilní mentorka',{exact:true})).toBeVisible();
    await page.getByRole('navigation',{name:'Quick navigation'}).getByRole('link',{name:'Teams',exact:true}).tap();
    const card=page.getByTestId(`team-card-${d.teamName}`);
    await card.locator('summary').filter({hasText:'Startupová matice'}).tap();
    await card.getByRole('button',{name:'Upravit matici'}).tap();
    await card.getByRole('textbox',{name:'PROBLÉM',exact:true}).fill('Odpověď uložená z mobilu.');
    await card.getByRole('combobox',{name:'Mentor startupové matice'}).selectOption({label:'Mobilní mentorka'});
    await card.getByRole('button',{name:'Uložit matici'}).tap();
    await expect(card.getByTestId('matrix-field-problem')).toContainText('Odpověď uložená z mobilu.');
    await card.getByRole('button',{name:'Edit team',exact:true}).tap();
    await page.getByRole('dialog').getByRole('textbox',{name:'Project Abstract',exact:true}).fill('Mobilní abstrakt');
    await page.getByRole('dialog').getByRole('button',{name:'Save Changes'}).tap();
    await expect(card.getByTestId('team-abstract')).toContainText('Mobilní abstrakt');
    await card.getByRole('button',{name:'Delete team',exact:true}).tap();
    await expect(page.getByRole('dialog')).toContainText(d.teamName);await fits(page);
    await page.getByRole('button',{name:'Cancel',exact:true}).tap();
    await expect(card).toBeVisible();
});

test('mobile public wall is manually readable and uploads/moderation fit without covering posts',async ({page,browser})=>{
    const d=await demo(page), post=await wall(page,d.encoded);
    const guest=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    try{
        const visitor=await guest.newPage();await visitor.goto(`/${d.encoded}/wall`);
        await expect(visitor.getByRole('switch',{name:'Enable auto-scroll layout'})).toHaveCount(0);
        await expect(visitor.getByRole('button',{name:'Wall display settings',exact:true})).toHaveCount(0);
        await expect(visitor.locator('article')).toHaveCount(1);
        await visitor.getByRole('button',{name:'Read full post'}).tap();await expect(visitor.getByRole('dialog')).toContainText(post.text);await visitor.getByRole('button',{name:'Close dialog',exact:true}).tap();
        await fits(visitor);
        await visitor.getByRole('link',{name:/Share a moment/}).getAttribute('href');
        await visitor.goto(`/${d.encoded}/wall/upload`);
        await visitor.getByRole('textbox',{name:'Your story'}).fill('Z telefonu na zeď');
        await visitor.getByRole('button',{name:'Submit for approval'}).tap();
        await expect(visitor.getByRole('heading',{name:'Thanks for sharing!'})).toBeVisible();
        await page.goto(`/app/${d.encoded}/social-wall`);
        await expect(page.getByRole('heading',{name:'Wall settings',exact:true})).not.toBeVisible();
        await page.getByRole('navigation',{name:'Post filters'}).getByRole('button',{name:/Pending/}).tap();
        const card=page.locator('article').filter({hasText:'Z telefonu na zeď'});await expect(card).toBeVisible();
        await card.getByRole('button',{name:/Approve/}).tap();await expect(card).toHaveCount(0);
        await page.getByRole('button',{name:'Wall settings and upload link'}).tap();
        await expect(page.getByLabel('Wall enabled',{exact:true})).toBeVisible();await fits(page);
        await visitor.goto(`/app/${d.encoded}/teams`);
        await visitor.getByRole('button',{name:'Log in',exact:true}).tap();
        await visitor.getByRole('dialog').getByPlaceholder('Password',{exact:true}).fill(password);
        await visitor.getByRole('button',{name:'Log In',exact:true}).tap();
        await expect(visitor.getByRole('dialog')).toHaveCount(0);await expect(visitor.getByTestId('add-team-fab')).toBeVisible();
    }finally{await guest.close()}
});

test('mobile dialogs trap keyboard focus, restore the trigger and preserve dark mode across pages',async ({page})=>{
    const d=await demo(page);await page.goto(`/app/${d.encoded}/teams`);
    const trigger=page.getByTestId('add-team-fab');await trigger.focus();await trigger.press('Enter');
    const dialog=page.getByRole('dialog'),close=dialog.getByRole('button',{name:'Close dialog'});
    await page.keyboard.press('Tab');await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');await expect(dialog.getByTestId('submit-team-btn')).toBeFocused();
    await page.keyboard.press('Tab');await expect(close).toBeFocused();
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
    await page.getByRole('button',{name:'More event pages'}).tap();
    await page.getByRole('button',{name:'Dark mode',exact:true}).tap();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.keyboard.press('Escape');
    await page.getByRole('navigation',{name:'Quick navigation'}).getByRole('link',{name:'Mentors',exact:true}).tap();
    await page.reload();await expect(page.locator('html')).toHaveClass(/dark/);await fits(page);
    await page.goto('/github/callback');await expect(page.getByRole('alert')).toBeVisible();
    const color=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
    expect(color).not.toBe('rgb(255, 255, 255)');await fits(page);
});

test('mobile password form saves explicitly and keeps the updated session usable',async({page})=>{
    const d=await demo(page);await page.goto(`/app/${d.encoded}/settings`);
    const form=page.locator('form').filter({has:page.getByRole('heading',{name:'Event Password',exact:true})});
    await form.getByLabel('Current password',{exact:true}).fill(password);
    await form.getByLabel('New password',{exact:true}).fill('new-mobile-password');
    const saved=page.waitForResponse(r=>r.url().includes('/api/auth/update'));
    await form.getByRole('button',{name:'Save password',exact:true}).tap();expect((await (await saved).json()).status).toBe(200);
    await expect(form.getByRole('status')).toHaveText('Password updated.');
    expect((await(await page.request.post('/api/team/add',{data:{username:d.name,teamName:'Po změně hesla',teamColor:'#3081e0'}})).json()).status).toBe(200);
    await fits(page);
});

test('mobile editing state and login follow the displayed event rather than another event session',async({page})=>{
    await demo(page);
    const other=`Jiná událost ${randomUUID()}`,encoded=encodeURIComponent(other);
    expect((await(await page.request.post('/api/auth/create',{data:{username:other,password}})).json()).status).toBe(200);
    await page.goto(`/app/${encoded}/teams`);
    await expect(page.getByTestId('add-team-fab')).toHaveCount(0);
    await page.getByRole('button',{name:'Log in',exact:true}).tap();
    await page.getByRole('dialog').getByLabel('Password',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Log In',exact:true}).tap();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Editing',exact:true})).toBeVisible();
    await expect(page.getByTestId('add-team-fab')).toBeVisible();
});
