import {test, expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

async function setup(page, numbered = false) {
  const name = `Mentor UI ${randomUUID()}`, password = 'password123';
  for (const action of ['create', 'login']) expect((await (await page.request.post(`/api/auth/${action}`, {data:{username:name,password}})).json()).status).toBe(200);
  const names = numbered ? ['11 - Aurora','21 - Orbit','31 - Nova','12 - Atlas','22 - Spark','32 - Wave','13 - Echo'] : ['11 - Aurora'];
  for (const teamName of names) expect((await (await page.request.post('/api/team/add', {data:{username:name,teamName,teamColor:'#3081e0'}})).json()).status).toBe(200);
  const data = (await (await page.request.get(`/api/event/${encodeURIComponent(name)}`)).json()).data;
  const team = data.teams[0];
  const notes = [
    {id:randomUUID(),content:'Critical API failure',type:'help_request',inKanban:true,status:'To Do',priority:'critical'},
    {id:randomUUID(),content:'Completed issue',type:'help_request',inKanban:true,status:'Done',priority:'high'},
    {id:randomUUID(),content:'Mentor observation',type:'mentor_note',inKanban:false,status:'To Do',priority:'medium'},
  ];
  expect((await (await page.request.put('/api/team/edit',{data:{username:name,teamId:team._id,revision:team.revision,teamName:team.name,teamColor:team.color,
    teamDescription:'Full description. '.repeat(15),teamOriginality:'Originality remains visible',
    teamProjectAbstract:[{type:'paragraph',runs:[{text:'Full project abstract. '.repeat(30)}]},{type:'bullet',runs:[{text:'Final abstract sentence',bold:true}]}],stickyNotes:notes}})).json()).status).toBe(200);
  await page.goto(`/app/${encodeURIComponent(name)}/teams`);
  const card = page.getByTestId(`team-card-${team.name}`);
  await expect(card).toBeVisible();
  return {name,team,notes,card,path:`/app/${encodeURIComponent(name)}`};
}

test('mentor navigation adapts to screen width and keeps search on one line', async ({page}) => {
  await setup(page,true);
  for (const width of [320,390,1024,1280,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    const header=await page.locator('.dashboard-header').boundingBox();
    expect(header!.height).toBeLessThanOrEqual(65);
    const search=await page.getByRole('searchbox',{name:'Search teams'}).boundingBox();
    const picker=await page.getByRole('combobox',{name:'Jump to team'}).boundingBox();
    expect(Math.abs(search!.y+search!.height/2-picker!.y-picker!.height/2)).toBeLessThan(2);
    if (width>=1024) await expect.poll(async()=>Math.round((await page.locator('aside').boundingBox())!.width)).toBe(width>=1280?208:72);
    if (width<1024) {
      await expect(page.locator('[data-testid^="team-card-"] h1').nth(1)).toHaveText('12 - Atlas');
      await expect(page.locator('[data-testid^="team-card-"] h1').nth(2)).toHaveText('13 - Echo');
    }
  }
  await expect(page.getByRole('button',{name:/^(Expand|Collapse) sidebar$/})).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Open navigation'}).click();
  await expect(page.getByRole('dialog').getByRole('navigation').getByRole('link')).toHaveCount(8);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Open navigation'})).toBeFocused();
});

test('mentor notes drawer retains failed drafts, focus and full project details',async({page})=>{
  const {card}=await setup(page);
  const abstract=card.getByTestId('team-abstract'), originality=card.getByTestId('team-originality');
  await expect(abstract).toContainText('Final abstract sentence');
  const a=await abstract.boundingBox(),o=await originality.boundingBox();
  expect(a!.y+a!.height).toBeLessThan(o!.y);
  await card.getByTestId('toggle-notes-btn').click();
  const drawer=page.getByRole('dialog',{name:'11 - Aurora',exact:true});
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('[data-note-lane=issues] .sticky-note')).toHaveCount(1);
  await expect(drawer.locator('[data-note-lane=notes] .sticky-note')).toHaveCount(1);
  await expect(drawer.locator('[data-note-lane=done] .sticky-note')).toHaveCount(1);
  await page.route('**/api/team/edit',r=>r.fulfill({json:{status:409,message:'Conflict'}}));
  const note=drawer.locator('[data-note-lane=notes] .sticky-note'),input=note.getByTestId('note-content');
  await input.fill('Retain this unsaved draft');
  await note.getByTestId('save-note-btn').click();
  await expect(note.getByText(/Could not save note/)).toBeVisible();
  await drawer.getByRole('button',{name:'Close dialog'}).click();
  await expect(drawer).toHaveCount(0);
  await expect(card.getByTestId('toggle-notes-btn')).toBeFocused();
  await card.getByTestId('toggle-notes-btn').click();
  await expect(input).toHaveValue('Retain this unsaved draft');
  await page.unroute('**/api/team/edit');
  await note.getByTestId('save-note-btn').click();
  await expect(note.getByTestId('save-note-btn')).toHaveText('Saved');
  await page.setViewportSize({width:390,height:844});
  await expect.poll(async()=>Math.round((await drawer.boundingBox())!.width)).toBe(390);
  await drawer.locator('[data-note-lane=done]').scrollIntoViewIfNeeded();
  await expect(drawer.getByRole('button',{name:'Close dialog'})).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
});

test('both issue conversions require confirmation and preserve note data',async({page})=>{
  const {card,name,notes}=await setup(page);
  await card.getByTestId('toggle-notes-btn').click();
  const drawer=page.getByRole('dialog'),note=drawer.locator(`[data-note-id="${notes[2].id}"]`);
  const toggle=note.getByRole('checkbox',{name:'Change to issue',exact:true});
  const prompt=note.getByRole('group',{name:'Confirm conversion'});
  let writes=0; page.on('request',r=>{if(r.url().endsWith('/api/team/edit')&&r.method()==='PUT')writes++;});
  await toggle.click();await expect(prompt).toBeVisible();await expect(toggle).not.toBeChecked();
  await page.keyboard.press('Escape');await expect(prompt).toHaveCount(0);expect(writes).toBe(0);
  await toggle.click();
  let release;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/api/team/edit',async r=>{await gate;await r.continue();});
  await prompt.getByRole('button',{name:'Change to issue',exact:true}).click();
  await expect.poll(()=>writes).toBe(1);
  await expect(drawer.locator(`[data-note-lane=notes] [data-note-id="${notes[2].id}"]`)).toHaveCount(1);
  release();
  await expect(drawer.locator(`[data-note-lane=issues] [data-note-id="${notes[2].id}"]`)).toHaveCount(1);
  await page.unroute('**/api/team/edit');
  await expect(toggle).toBeFocused();
  await toggle.click();await expect(toggle).toBeChecked();
  await prompt.getByRole('button',{name:'Cancel',exact:true}).click();expect(writes).toBe(1);
  await toggle.click();await prompt.getByRole('button',{name:'Change to note',exact:true}).click();
  await expect(drawer.locator(`[data-note-lane=notes] [data-note-id="${notes[2].id}"]`)).toHaveCount(1);
  const stored=(await(await page.request.get(`/api/event/${encodeURIComponent(name)}`)).json()).data.teams[0].stickyNotes;
  expect(stored).toHaveLength(3);
  expect(stored.find(n=>n.id===notes[2].id)).toMatchObject({...notes[2],inKanban:false});
});

test('mentor panel is read-only for guests and retains a full-height collapse rail',async({page,browser})=>{
  const {path}=await setup(page);
  const guest=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:720},reducedMotion:'reduce'});
  try {
    const view=await guest.newPage();await view.goto(new URL(path+'/teams',page.url()).href);
    await view.getByTestId('team-card-11 - Aurora').getByTestId('toggle-notes-btn').click();
    const drawer=view.getByRole('dialog'),rail=drawer.getByRole('button',{name:'Collapse notes panel'});
    await expect(rail).toBeVisible();expect((await rail.boundingBox())!.height).toBe(720);
    await expect(drawer.getByTestId('save-note-btn')).toHaveCount(0);
    await expect(drawer.getByRole('checkbox',{name:'Change to issue'}).first()).toBeDisabled();
    await rail.click();await expect(drawer).toHaveCount(0);
    await expect(view.getByTestId('toggle-notes-btn')).toBeFocused();
  } finally {await guest.close();}
});
