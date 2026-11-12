import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWMwaHxg0PiAAUIBACkqBkV72qJcAAAAAElFTkSuQmCC','base64');
const password='password123';
async function setup(page,name=`Wall ${randomUUID()}`) {
  expect((await (await page.request.post('/api/auth/create',{ data:{ username:name,password } })).json()).status).toBe(200);
  expect((await (await page.request.post('/api/auth/login',{ data:{ username:name,password } })).json()).status).toBe(200);
  await page.goto(`/app/${encodeURIComponent(name)}/social-wall`);
  await expect(page.getByRole('heading',{ name:'Wall settings' })).toBeVisible();
  return name;
}
async function changed(page,action) {
  const response=page.waitForResponse(r => r.url().includes('/posts') && r.request().method()==='POST');
  await action(); expect((await (await response).json()).status).toBe(200);
}

test('Instagram collector saves hashtag drafts, preserves conflicts and stops without API credits', async ({ page }) => {
  const name = await setup(page), encoded = encodeURIComponent(name);
  await page.goto(`/app/${encoded}/settings`);
  const form = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Instagram social collector' }) });
  await expect(form.getByRole('status').filter({ hasText: 'Instagram polling is paused.' })).toBeVisible();
  await form.getByLabel('Hashtags to query').fill('#hackathon, junior2026\n#hackathon');
  await form.getByLabel('Polling interval (minutes)').fill('12');
  await changed(page, () => form.getByRole('button', { name: 'Save Instagram queries' }).click());
  let data = (await (await page.request.get(`/api/wall/${encoded}/posts`)).json()).data;
  expect(data.wall.instagramEnabled).toBe(false);
  expect(data.wall.instagramQueryHashtags).toEqual(['#hackathon', '#junior2026']);
  expect(data.wall.instagramModerationMode).toBeUndefined();
  expect(data.wall.xEnabled).toBe(false); expect(data.wall.moderationMode).toBe('manual');
  await page.reload(); await expect(form.getByLabel('Hashtags to query')).toHaveValue('#hackathon, #junior2026');
  await page.request.post(`/api/wall/${encoded}/posts`, { data: { action: 'updateSettings', revision: data.wall.revision, settings: { windowMinutes: 1800 } } });
  await form.getByLabel('Hashtags to query').fill('#unsaved');
  const conflict = page.waitForResponse(response => response.url().includes('/posts') && response.request().method() === 'POST');
  await form.getByRole('button', { name: 'Save Instagram queries' }).click();
  expect((await (await conflict).json()).status).toBe(409);
  await expect(form.getByRole('alert')).toContainText('Your draft is kept');
  await changed(page, () => form.getByRole('button', { name: 'Stop Instagram polling', exact: true }).click());
  await expect(form.getByRole('status').filter({ hasText: 'OFF, confirmed by the server' })).toBeVisible();
  await expect(form.getByLabel('Hashtags to query')).toHaveValue('#unsaved');
  data = (await (await page.request.get(`/api/wall/${encoded}/posts`)).json()).data;
  expect(data.wall.instagramQueryHashtags).toEqual(['#hackathon', '#junior2026']);
  expect(data.wall.instagramEnabled).toBe(false);
  expect(JSON.stringify((await (await page.request.get(`/api/wall/${encoded}`)).json()))).not.toContain('instagramQuery');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await form.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test('public photo submission stays private until approved and remains subject to moderation',async ({ page,browser }) => {
  const name=await setup(page);
  await changed(page,() => page.getByLabel('Wall enabled',{ exact:true }).check());
  const guest=await browser.newContext(), upload=await guest.newPage();
  try {
    await upload.goto(`/${encodeURIComponent(name)}/wall/upload`);
    await upload.getByRole('textbox',{ name:'Your name' }).fill('Žákyně');
    await upload.getByRole('textbox',{ name:'Your story' }).fill('Náš první prototyp!');
    await upload.getByLabel('Add a photo',{ exact:false }).setInputFiles({ name:'moment.png',mimeType:'image/png',buffer:png });
    const submitted=upload.waitForResponse(r => r.url().includes('/api/wall/') && r.request().method()==='POST');
    await upload.getByRole('button',{ name:'Submit for approval' }).click();
    const body=await (await submitted).json();expect(body.status).toBe(200);
    await expect(upload.getByRole('heading',{ name:'Thanks for sharing!' })).toBeVisible();
    const url=body.data.imageUrl;
    expect((await (await guest.request.get(url)).json()).status).toBe(404);
    expect((await (await guest.request.get(`/api/wall/${encodeURIComponent(name)}`)).json()).data.posts).toHaveLength(0);
    await page.getByRole('button',{ name:'Refresh posts' }).click();
    const card=page.getByTestId(`wall-post-${body.data.id}`);
    await expect(card.getByText('Náš první prototyp!')).toBeVisible();
    await changed(page,() => card.getByRole('button',{ name:'Approve',exact:false }).click());
    const approved=await guest.request.get(url);expect(approved.headers()['content-type']).toContain('image/webp');const stored=await approved.body();expect(stored.toString('ascii',8,12)).toBe('WEBP');
    const range=await guest.request.get(url,{ headers:{ Range:'bytes=0-7' } });expect(range.status()).toBe(206);expect(await range.body()).toEqual(stored.subarray(0,8));
    await upload.goto(`/${encodeURIComponent(name)}/wall`);
    await expect(upload.getByRole('button',{ name:'Wall display settings', exact:true })).toHaveCount(0);
    await expect(upload.getByText('Náš první prototyp!',{ exact:true }).first()).toBeVisible();
    await expect(upload.getByRole('button',{ name:/Switch to .* mode/ })).toHaveCount(0);
    await card.getByRole('button',{ name:'Post actions' }).click();
    await changed(page,() => card.getByRole('button',{ name:'Hide',exact:true }).click());
    expect((await (await guest.request.get(url)).json()).status).toBe(404);
    await card.getByRole('button',{ name:'Post actions' }).click();
    page.once('dialog',dialog => dialog.accept());
    await changed(page,() => card.getByRole('button',{ name:'Delete',exact:true }).click());
    await expect(card).toHaveCount(0);
  } finally { await guest.close(); }
});

test('disabled states, filters and event ownership apply on both UI and API',async ({ page,browser }) => {
  const name=await setup(page), encoded=encodeURIComponent(name);
  const guest=await browser.newContext(), visitor=await guest.newPage();
  try {
    await visitor.goto(`/${encoded}/wall`);await expect(visitor.getByRole('heading',{ name:"The event wall isn't available" })).toBeVisible();
    await visitor.goto(`/${encoded}/wall/upload`);await expect(visitor.getByRole('heading',{ name:"Uploads aren't available" })).toBeVisible();
    expect((await (await guest.request.post(`/api/wall/${encoded}`,{ data:{ text:'disabled' } })).json()).status).toBe(403);
    expect((await (await guest.request.get(`/api/wall/${encoded}/posts`)).json()).status).toBe(401);
    await changed(page,() => page.getByLabel('Wall enabled',{ exact:true }).check());
    await page.getByLabel('Filtered keywords').fill('spam');
    await changed(page,() => page.getByLabel('Filtered keywords').blur());
    expect((await (await guest.request.post(`/api/wall/${encoded}`,{ data:{ text:'SPAM' } })).json()).status).toBe(422);
    expect((await (await guest.request.post(`/api/wall/${encoded}`,{ data:{ text:'OK',sourceUrl:'javascript:alert(1)' } })).json()).status).toBe(400);
    const invalid=await visitor.evaluate(async ({ encoded }) => {
      const form=new FormData();form.append('file',new Blob(['<svg/>'],{ type:'image/png' }),'fake.png');
      return (await (await fetch(`/api/wall/${encoded}`,{ method:'POST',body:form })).json()).status;
    },{ encoded });expect(invalid).toBe(415);
    const other=`Other-${randomUUID()}`;await page.request.post('/api/auth/create',{ data:{ username:other,password } });
    expect((await (await page.request.get(`/api/wall/${other}/posts`)).json()).status).toBe(403);
    await visitor.goto(`/app/${encoded}/social-wall`);
    await expect(visitor.getByRole('status').filter({ hasText:'Log in to this event' })).toBeVisible();
    await expect(visitor.getByRole('heading',{ name:'Wall settings' })).toHaveCount(0);
  } finally { await guest.close(); }
});

test('moderation rejects stale changes and X settings persist without exposing server credentials',async ({ page }) => {
  const name=await setup(page), encoded=encodeURIComponent(name);
  await changed(page,() => page.getByLabel('Wall enabled',{ exact:true }).check());
  const post=(await (await page.request.post(`/api/wall/${encoded}`,{ data:{ text:'Test post' } })).json()).data;
  await page.getByRole('button',{ name:'Refresh posts' }).click();
  const card=page.getByTestId(`wall-post-${post.id}`);
  await expect(card.getByText('Test post')).toBeVisible();
  expect((await (await page.request.post(`/api/wall/${encoded}/posts`,{ data:{ action:'reject',postId:post.id,revision:0 } })).json()).status).toBe(200);
  const stale=page.waitForResponse(r => r.url().includes('/posts') && r.request().method()==='POST');
  await card.getByRole('button',{ name:'Approve',exact:false }).click();expect((await (await stale).json()).status).toBe(409);
  await expect(page.getByRole('alert')).toContainText('Post changed');
  await expect(card.getByText('Rejected',{ exact:true })).toBeVisible();
  await page.getByRole('link',{ name:'Settings',exact:true }).click();
  await expect(page.getByRole('heading',{ name:'X social collector' })).toBeVisible();
  const input=page.locator('form').filter({ has: page.getByRole('heading', { name: 'X social collector', exact: true }) }).getByLabel('Hashtags to query');
  await input.fill('#junior2026');
  const save=page.waitForResponse(r => r.url().includes('/posts') && r.request().method()==='POST');
  await page.getByRole('button',{name:'Save queries',exact:true}).click();expect((await (await save).json()).status).toBe(200);
  await page.reload();await expect(input).toHaveValue('#junior2026');
  const publicBody=await (await page.request.get(`/api/wall/${encoded}`)).json();
  expect(JSON.stringify(publicBody)).not.toContain('xQuery');
  expect(JSON.stringify(publicBody)).not.toContain('Bearer');
  expect(publicBody.canEdit).toBe(true);
  await expect(page.getByText('Automatic X polling is paused.', { exact:false })).toBeVisible();
});


test('moderation search and pagination request bounded pages and explain filters',async({page})=>{
  const name=await setup(page),encoded=encodeURIComponent(name);
  const base=(await(await page.request.get(`/api/wall/${encoded}/posts`)).json()).data;
  const rows=Array.from({length:27},(_,i)=>({id:'page-'+i,platform:'manual',authorName:i<3?'FindAuthor':'Student',handle:'',text:'Post '+i,status:'pending',approved:false,hidden:false,pinned:false,revision:0,createdAt:new Date(Date.now()-i*1000).toISOString(),imageUrl:'',videoUrl:'',sourceUrl:''}));
  let query;
  await page.route('**/api/wall/'+encoded+'/posts?*',async route=>{
    query=new URL(route.request().url()).searchParams;const search=query.get('search') || '',perPage=Number(query.get('perPage')),pageNumber=Number(query.get('page'));
    const matches=rows.filter(p=>(p.text+' '+p.authorName).toLowerCase().includes(search.toLowerCase()));
    return route.fulfill({json:{status:200,data:{...base,posts:matches.slice((pageNumber-1)*perPage,pageNumber*perPage),stats:{total:27,pending:27,approved:0,rejected:0,pinned:0},pagination:{page:pageNumber,perPage,pageCount:Math.max(1,Math.ceil(matches.length/perPage)),totalMatched:matches.length}}}});
  });
  await page.reload();await expect(page.getByTestId(/^wall-post-/)).toHaveCount(20);
  await page.getByLabel('Per page',{exact:true}).selectOption('10');await expect(page.getByTestId(/^wall-post-/)).toHaveCount(10);
  await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.getByRole('navigation',{name:'Post pages'})).toContainText('2 / 3');await expect.poll(()=>query?.get('page')).toBe('2');
  await page.getByLabel('Search posts',{exact:true}).fill('FindAuthor');await expect(page.getByTestId(/^wall-post-/)).toHaveCount(3);expect(query.get('page')).toBe('1');
  await expect(page.getByRole('button',{name:'Next page',exact:true})).toBeDisabled();
  await expect(page.getByLabel('Blocked words',{exact:true})).toHaveAttribute('aria-describedby','blocked-words-hint');
  await expect(page.locator('#blocked-authors-hint')).toContainText('Commas or new lines');
});

test('projector wall shows a bare top-right QR without widening the feed', async ({ page }) => {
  const name = await setup(page), encoded = encodeURIComponent(name);
  await changed(page, () => page.getByLabel('Wall enabled', { exact: true }).check());
  const config=(await(await page.request.get(`/api/wall/${encoded}/posts`)).json()).data.wall;
  expect((await(await page.request.post(`/api/wall/${encoded}/posts`,{data:{action:'updateSettings',revision:config.revision,settings:{title:'AT&T Hackathon Junior 2026'}}})).json()).status).toBe(200);
  const post = (await (await page.request.post(`/api/wall/${encoded}`, { data: { text: 'Projector display' } })).json()).data;
  expect((await (await page.request.post(`/api/wall/${encoded}/posts`, { data: { action: 'approve', postId: post.id, revision: 0 } })).json()).status).toBe(200);
  // Avoid an external QR service dependency while verifying the displayed URL and geometry.
  await page.route('https://api.qrserver.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 2488, height: 1298 }, { width: 3440, height: 1440 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`/${encoded}/wall`);
    const cog = page.getByRole('button', { name: 'Wall display settings', exact: true });
    await expect(cog).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('switch')).toHaveCount(0);
    const qr = page.getByRole('img', { name: 'Scan to upload a post' });
    await expect(qr).toBeVisible();
    expect(new URL(await qr.getAttribute('src')).searchParams.get('data')).toBe(new URL(`/${encoded}/wall/upload`, page.url()).href);
    const qrBox = await qr.boundingBox(), feed = await page.locator('[data-wall-viewport]').boundingBox(), cogBox = await cog.boundingBox();
    expect(qrBox.x).toBeGreaterThan(viewport.width > 2200 ? feed.x + feed.width : viewport.width * 0.8);
    const sharingBox = await page.getByTestId('wall-sharing-qr').boundingBox();
    expect(Math.abs(sharingBox.y - 16)).toBeLessThan(2);
    await expect(page.getByTestId('wall-sharing-qr')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.getByTestId('wall-sharing-qr')).toHaveCSS('box-shadow', 'none');
    await expect(page.getByTestId('wall-sharing-qr')).toHaveCSS('border-top-width', '0px');
    await expect(qr).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    if (viewport.width > 2200) {
      // The QR square fills the actual empty gutter with 16px on each side.
      expect(Math.abs(sharingBox.x - (feed.x + feed.width + 16))).toBeLessThan(2);
      expect(Math.abs(viewport.width - sharingBox.x - sharingBox.width - 16)).toBeLessThan(2);
      expect(sharingBox.width).toBeGreaterThan(300);
    } else {
      expect(sharingBox.width).toBe(186);
    }
    expect(sharingBox.y).toBeGreaterThanOrEqual(0);
    expect(sharingBox.y + sharingBox.height).toBeLessThanOrEqual(viewport.height);
    expect(qrBox.width).toBe(sharingBox.width);
    expect(feed.width).toBe(Math.min(1800, viewport.width));
    expect(qrBox.width).toBeGreaterThanOrEqual(160);
    expect(viewport.width-qrBox.x-qrBox.width).toBeGreaterThanOrEqual(16);
    expect(qrBox.y+qrBox.height).toBeGreaterThan(feed.y);
    const rail=await page.getByTestId('wall-title-rail').boundingBox();expect(rail.x).toBe(0);
    await expect(page.getByRole('heading',{name:'AT&T Hackathon Junior 2026',exact:true})).toHaveCSS('writing-mode','vertical-rl');
    expect(feed.height).toBeGreaterThan(viewport.height * 0.9);
    expect(cogBox.y).toBeGreaterThan(viewport.height - 80);
    await cog.click();
    await expect(page.getByRole('switch', { name: 'Enable auto-scroll layout' })).toBeChecked();
    await page.getByRole('button',{name:'Expand QR code',exact:true}).click();
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
    const full=await dialog.boundingBox();expect(full.width).toBe(viewport.width);expect(full.height).toBe(viewport.height);
    const expandedQr = dialog.getByRole('img',{name:'Scan to upload a post'});
    await expect(expandedQr).toBeVisible();
    const headingBox = await dialog.getByRole('heading',{name:'Share a moment',exact:true}).boundingBox();
    expect(Math.abs(headingBox.x + headingBox.width / 2 - viewport.width / 2)).toBeLessThan(2);
    const expandedBox = await expandedQr.boundingBox();
    expect(expandedBox.height).toBeGreaterThan(viewport.height * 0.6);
    expect(expandedBox.y + expandedBox.height).toBeLessThan(viewport.height);
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(cog).toBeFocused();await cog.click();
    await page.getByLabel('Show sharing QR code', { exact: true }).uncheck();
    await expect(qr).toHaveCount(0);
    await page.getByRole('switch', { name: 'Enable auto-scroll layout' }).uncheck();
    await expect(page.locator('article')).toHaveCount(1);
    await page.getByLabel('Show sharing QR code', { exact: true }).check();
    await expect(qr).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(cog).toBeFocused();
    await expect(cog).toHaveAttribute('aria-expanded', 'false');
    await cog.click();
    await page.getByRole('heading', { name:'AT&T Hackathon Junior 2026',exact:true }).click();
    await expect(cog).toHaveAttribute('aria-expanded', 'false');
  }
});


test('wall cogwheel and polling settings require a session for the matching event', async ({ page, browser }) => {
  const name = await setup(page), encoded = encodeURIComponent(name);
  await page.goto(`/${encoded}/wall`);
  await expect(page.getByRole('button', { name: 'Wall display settings', exact: true })).toBeVisible();
  const guest = await browser.newContext();
  try {
    const visitor = await guest.newPage();
    await visitor.goto(`/${encoded}/wall`);
    await expect(visitor.getByRole('button', { name: 'Wall display settings', exact: true })).toHaveCount(0);
    expect((await (await guest.request.get(`/api/wall/${encoded}`)).json()).canEdit).toBe(false);
    const patch = { username:name, setting:'wall.xCollector', revision:0, value:{ enabled:true, intervalMinutes:5, hashtags:['#test'], handles:[] } };
    expect((await (await guest.request.post('/api/auth/update', { data:patch })).json()).status).toBe(401);
    const other = `Other ${randomUUID()}`;
    await guest.request.post('/api/auth/create', { data:{ username:other, password } });
    await guest.request.post('/api/auth/login', { data:{ username:other, password } });
    await visitor.reload();
    await expect(visitor.getByRole('button', { name: 'Wall display settings', exact: true })).toHaveCount(0);
    expect((await (await guest.request.post('/api/auth/update', { data:patch })).json()).status).toBe(403);
    // A valid event session can enable and pause collection; no token means no external calls.
    expect((await (await page.request.post('/api/auth/update', { data:patch })).json()).status).toBe(200);
    patch.revision = 1; patch.value.enabled = false;
    expect((await (await page.request.post('/api/auth/update', { data:patch })).json()).status).toBe(200);
    const settings = (await (await page.request.get(`/api/wall/${encoded}/posts`)).json()).data.wall;
    expect(settings.xEnabled).toBe(false); expect(settings.xPollIntervalMinutes).toBe(5);
    await page.context().clearCookies();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Wall display settings', exact: true })).toHaveCount(0);
  } finally { await guest.close(); }
});


test('X query drafts survive blur, validation errors, conflicts and edits during a slow save', async ({ page }) => {
  const name = await setup(page), encoded = encodeURIComponent(name);
  await page.goto(`/app/${encoded}/settings`);
  const tags = page.locator('form').filter({ has: page.getByRole('heading', { name: 'X social collector', exact: true }) }).getByLabel('Hashtags to query'), handles = page.getByLabel('Handles to follow');
  await expect(tags).toBeEnabled();
  await tags.fill('#junior #student, #nápad\n#junior');
  await handles.fill('@host @mentor, coach');
  await handles.blur();
  expect((await (await page.request.get(`/api/wall/${encoded}/posts`)).json()).data.wall.xQueryHashtags).toEqual([]);
  await changed(page, () => page.getByRole('button',{name:'Save queries',exact:true}).click());
  await expect(tags).toHaveValue('#junior #student, #nápad\n#junior');
  await expect(handles).toHaveValue('@host @mentor, coach');
  await page.reload();
  await expect(tags).toHaveValue('#junior, #student, #nápad');
  await expect(handles).toHaveValue('@host, @mentor, @coach');
  await handles.fill('@invalid-account!');
  const invalid = page.waitForResponse(r => r.url().includes('/posts') && r.request().method()==='POST');
  await page.getByRole('button',{name:'Save queries',exact:true}).click();
  expect((await (await invalid).json()).status).toBe(400);
  await expect(handles).toHaveValue('@invalid-account!');
  await handles.fill('@draft'); await tags.fill('#draft');
  expect((await (await page.request.post(`/api/wall/${encoded}/posts`, { data:{ action:'updateSettings', revision:1, settings:{ xQueryHashtags:['#elsewhere'] } } })).json()).status).toBe(200);
  const conflict = page.waitForResponse(r => r.url().includes('/posts') && r.request().method()==='POST');
  await page.getByRole('button',{name:'Save queries',exact:true}).click();
  expect((await (await conflict).json()).status).toBe(409);
  await expect(tags).toHaveValue('#draft'); await expect(handles).toHaveValue('@draft');
  await expect(page.getByText('Settings changed elsewhere.', {exact:false})).toBeVisible();
  await page.locator('form').filter({ has: page.getByRole('heading', { name: 'X social collector', exact: true }) }).getByRole('button',{name:'Reload saved settings',exact:true}).click();
  await expect(tags).toHaveValue('#elsewhere');
  let release; const gate = new Promise(resolve => { release = resolve; });
  await page.route(`**/api/wall/${encoded}/posts`, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    await gate; await route.continue();
  });
  await tags.fill('#first');
  await page.getByRole('button',{name:'Save queries',exact:true}).click();
  await expect(page.getByRole('button',{name:'Saving…',exact:true})).toBeVisible();
  await tags.fill('#still_typing'); release();
  await expect(page.getByRole('button',{name:'Save queries',exact:true})).toBeEnabled();
  await expect(tags).toHaveValue('#still_typing');
  expect((await (await page.request.get(`/api/wall/${encoded}/posts`)).json()).data.wall.xQueryHashtags).toEqual(['#first']);
  await changed(page, () => page.getByRole('button',{name:'Save queries',exact:true}).click());
  await page.reload(); await expect(tags).toHaveValue('#still_typing');
});


test('default 100-character preview opens full article', async ({ page }) => {
  const name=await setup(page), encoded=encodeURIComponent(name);
  await changed(page,()=>page.getByLabel('Wall enabled',{exact:true}).check());
  const text='Complete post text '.repeat(60)+'END';
  const post=(await(await page.request.post(`/api/wall/${encoded}`,{data:{text}})).json()).data;
  await page.request.post(`/api/wall/${encoded}/posts`,{data:{action:'approve',postId:post.id,revision:0}});
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/${encoded}/wall`);
  await expect(page.locator('[data-wall-copy="1"] article')).toContainText(text.slice(0,100));
  await page.locator('[data-wall-copy="1"] [data-read-post]').click();
  await expect(page.getByRole('dialog')).toContainText(text);
});

test('Stop X polling works during loading/saving and stale writes cannot switch it back on', async ({ page, browser }) => {
  const name=await setup(page), encoded=encodeURIComponent(name), path=`/api/wall/${encoded}/posts`;
  expect((await(await page.request.post(path,{data:{action:'updateSettings',revision:0,settings:{xEnabled:true,xQueryHashtags:['#existing']}}})).json()).status).toBe(200);
  let releaseLoad;const loadGate=new Promise(resolve=>{releaseLoad=resolve});let failFirstStop=true;
  await page.route(`**${path}`,async route=>{
    if(route.request().method()==='GET'){await loadGate;}
    else if(failFirstStop&&route.request().postDataJSON().action==='pauseX'){
      failFirstStop=false;return route.fulfill({json:{status:503,message:'Unavailable'}});
    }
    await route.continue();
  });
  await page.goto(`/app/${encoded}/settings`);
  const stop=page.getByRole('button',{name:'Stop X polling',exact:true});await expect(stop).toBeEnabled();
  await stop.click();await expect(page.getByRole('alert')).toContainText('Could not confirm');
  await expect(page.getByText('X polling is OFF — confirmed by the server.',{exact:false})).toHaveCount(0);
  expect((await(await page.request.get(path)).json()).data.wall.xEnabled).toBe(true);
  await changed(page,()=>stop.click());
  await expect(page.getByText('X polling is OFF — confirmed by the server.',{exact:false})).toBeVisible();
  const loadFinished=page.waitForResponse(r=>r.url().includes(path)&&r.request().method()==='GET');
  releaseLoad();await loadFinished;await page.unroute(`**${path}`);
  const tags=page.locator('form').filter({ has: page.getByRole('heading', { name: 'X social collector', exact: true }) }).getByLabel('Hashtags to query');await expect(tags).toHaveValue('#existing');
  const stopped=(await(await page.request.get(path)).json()).data.wall;
  expect((await(await page.request.post(path,{data:{action:'updateSettings',revision:stopped.revision,settings:{xEnabled:true}}})).json()).status).toBe(200);
  await page.reload();await expect(page.getByRole('checkbox',{name:'Automatic X polling'})).toBeChecked();
  // Hold an already-completed query save response containing ON until after STOP confirms OFF.
  let releaseSave,serverSaved;
  const responseGate=new Promise(resolve=>{releaseSave=resolve}),serverGate=new Promise(resolve=>{serverSaved=resolve});
  await page.route(`**${path}`,async route=>{
    if(route.request().method()!=='POST'||route.request().postDataJSON().action!=='updateSettings')return route.continue();
    const response=await route.fetch();serverSaved();await responseGate;await route.fulfill({response});
  });
  await tags.fill('#draft');await page.getByRole('button',{name:'Save queries',exact:true}).click();await serverGate;
  await expect(page.getByRole('button',{name:'Saving…',exact:true})).toBeDisabled();await expect(stop).toBeEnabled();
  const toggle=page.getByRole('checkbox',{name:'Automatic X polling'});
  await expect(toggle).toBeEnabled();
  await changed(page,()=>toggle.uncheck());releaseSave();
  await expect(page.getByRole('button',{name:'Save queries',exact:true})).toBeEnabled();
  await expect(page.getByRole('checkbox',{name:'Automatic X polling'})).not.toBeChecked();
  await expect(tags).toHaveValue('#draft');
  const result=(await(await page.request.get(path)).json()).data.wall;expect(result.xEnabled).toBe(false);
  const guest=await browser.newContext();try{expect((await(await guest.request.post(path,{data:{action:'pauseX'}})).json()).status).toBe(401);}finally{await guest.close();}
  await page.reload();await expect(page.getByRole('checkbox',{name:'Automatic X polling'})).not.toBeChecked();
});


test('hover without opening a post resumes after five seconds, including with the pointer parked', async ({ page }) => {
  const name=await setup(page),encoded=encodeURIComponent(name);
  await changed(page,()=>page.getByLabel('Wall enabled',{exact:true}).check());
  const post=(await(await page.request.post(`/api/wall/${encoded}`,{data:{text:'Hover without opening the reader. '.repeat(12)}})).json()).data;
  expect((await(await page.request.post(`/api/wall/${encoded}/posts`,{data:{action:'approve',postId:post.id,revision:0}})).json()).status).toBe(200);
  await page.setViewportSize({width:1280,height:720});await page.goto(`/${encoded}/wall`);
  const card=page.locator('[data-wall-copy="1"] article');await expect(card).toBeVisible();
  const box=await card.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  const track=page.getByTestId('wall-feed-track'),paused=await track.getAttribute('style');
  await page.waitForTimeout(4000);expect(await track.getAttribute('style')).toBe(paused);
  await expect.poll(()=>track.getAttribute('style'),{timeout:3500}).not.toBe(paused);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Leaving the feed starts the same delay; it must not leave a permanent hover lock.
  await page.mouse.move(10,10);const left=await track.getAttribute('style');
  await page.waitForTimeout(4000);expect(await track.getAttribute('style')).toBe(left);
  await expect.poll(()=>track.getAttribute('style'),{timeout:3500}).not.toBe(left);
});

test('wall starts scrolling the first batch before remaining posts or media finish loading', async ({ page }) => {
  const name=await setup(page),encoded=encodeURIComponent(name),total=120;
  let releaseRest;const restGate=new Promise(resolve=>{releaseRest=resolve});
  let releaseMedia;const mediaGate=new Promise(resolve=>{releaseMedia=resolve});
  const mediaRequests=new Set();
  const posts=Array.from({length:total},(_,i)=>({id:'lazy-'+i,platform:'x',authorName:'Student '+i,handle:'@student',text:'Lazy wall post '+i+' '+ 'Text '.repeat(30),imageUrl:`https://wall-media.invalid/image-${i}.webp`,videoUrl:'',sourceUrl:'',pinned:false}));
  await page.route(`**/api/wall/${encoded}*`,async route=>{
    const url=new URL(route.request().url());if(url.pathname!==`/api/wall/${encoded}`)return route.continue();
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||200);
    if(offset)await restGate;
    await route.fulfill({json:{status:200,canEdit:true,data:{wall:{enabled:true,publicUploadEnabled:false,idleWaitSeconds:5,scrollSpeed:40,revision:0},posts:posts.slice(offset,offset+limit),total,hasMore:offset+limit<total}}});
  });
  await page.route('https://wall-media.invalid/**',async route=>{mediaRequests.add(route.request().url());await mediaGate;await route.fulfill({contentType:'image/png',body:png});});
  await page.setViewportSize({width:1440,height:900});
  // A stationary cursor over the newly mounted feed must not trigger a startup pause.
  await page.mouse.move(600,400);await page.goto(`/${encoded}/wall`);
  const track=page.getByTestId('wall-feed-track');await expect(track).toBeVisible();
  await expect(page.locator('[data-wall-copy="1"] article')).toHaveCount(12);
  const before=await track.getAttribute('style');
  await expect.poll(()=>track.getAttribute('style'),{timeout:1800}).not.toBe(before);
  const oldNode=await page.locator('[data-wall-copy="1"] article').first().elementHandle();
  releaseRest();
  await expect(page.locator('[data-wall-copy="1"] article')).toHaveCount(total);
  expect(mediaRequests.size).toBeLessThan(40);
  expect(await oldNode.evaluate(node=>node.isConnected)).toBe(true);
  releaseMedia();
});

test('cogwheel speed presets persist for the event and reject guests and stale writes',async({page,browser})=>{
  const name=await setup(page),encoded=encodeURIComponent(name);
  await changed(page,()=>page.getByLabel('Wall enabled',{exact:true}).check());
  const post=(await(await page.request.post(`/api/wall/${encoded}`,{data:{text:'Speed control example'}})).json()).data;
  expect((await(await page.request.post(`/api/wall/${encoded}/posts`,{data:{action:'approve',postId:post.id,revision:0}})).json()).status).toBe(200);
  await page.setViewportSize({width:1440,height:900});await page.goto(`/${encoded}/wall`);
  const cog=page.getByRole('button',{name:'Wall display settings',exact:true});await expect(cog).toBeVisible();await cog.click();
  const speed=page.getByLabel('Scroll speed',{exact:true});await expect(speed).toHaveValue('40');
  for(const value of ['20','60','80'])await changed(page,()=>speed.selectOption(value));
  await page.reload();await cog.click();await expect(speed).toHaveValue('80');
  const path=`/api/wall/${encoded}/posts`,saved=(await(await page.request.get(path)).json()).data.wall;
  expect(saved.xEnabled).toBe(false);expect(saved.instagramEnabled).toBe(false);
  expect((await(await page.request.post(path,{data:{action:'setSpeed',speed:20,revision:saved.revision-1}})).json()).status).toBe(409);
  expect((await(await page.request.post(path,{data:{action:'setSpeed',speed:900,revision:saved.revision}})).json()).status).toBe(400);
  const guest=await browser.newContext();try{expect((await(await guest.request.post(path,{data:{action:'setSpeed',speed:20,revision:saved.revision}})).json()).status).toBe(401);}finally{await guest.close();}
});

test('pinned event placeholders can be edited without losing their pin',async({page})=>{
 const name=await setup(page),encoded=encodeURIComponent(name),endpoint=`/api/wall/${encoded}/posts`;
 await changed(page,()=>page.getByLabel('Wall enabled',{exact:true}).check());
 const post=(await(await page.request.post(`/api/wall/${encoded}`,{data:{text:'Event placeholder',authorName:'Demo'}})).json()).data;
 for(const [action,revision] of [['approve',0],['pin',1]])expect((await(await page.request.post(endpoint,{data:{action,postId:post.id,revision}})).json()).status).toBe(200);
 await page.reload();const card=page.getByTestId('wall-post-'+post.id);
 await card.getByRole('button',{name:'Edit post',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Edit post'});
 await dialog.getByLabel('Author',{exact:true}).fill('Pořadatelé');
 await dialog.getByLabel('Post text',{exact:true}).fill('Program akce: <b>žádné HTML</b>');
 await changed(page,()=>dialog.getByRole('button',{name:'Save post',exact:true}).click());
 await expect(dialog).toHaveCount(0);await expect(card).toContainText('Program akce: <b>žádné HTML</b>');
 await expect(card).toContainText('Pořadatelé');await expect(card).toContainText('Pinned');
 await expect(card.locator('b')).toHaveCount(0);
 await card.getByRole('button',{name:'Edit post',exact:true}).click();
 await dialog.getByLabel('Post text',{exact:true}).fill('Keep this draft');
 const latest=(await(await page.request.get(endpoint)).json()).data.posts[0];
 await page.request.post(endpoint,{data:{action:'hide',postId:post.id,revision:latest.revision}});
 await dialog.getByRole('button',{name:'Save post',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('changed');
 await expect(dialog.getByRole('textbox',{name:'Post text',exact:true})).toHaveText('Keep this draft');
 const editor=dialog.getByRole('textbox',{name:'Post text',exact:true}),editorBox=await editor.boundingBox();
 await page.mouse.move(editorBox.x+editorBox.width/2,editorBox.y+editorBox.height/2);
 await page.mouse.down();await page.mouse.move(2,2,{steps:8});await page.mouse.up();
 await expect(dialog).toBeVisible();await expect(editor).toHaveText('Keep this draft');
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 await card.getByRole('button',{name:'Edit post',exact:true}).click();
 await expect(dialog).toBeVisible();
 await page.locator('.dialog-backdrop').click({position:{x:2,y:2}});
 await expect(dialog).toHaveCount(0);
});

test('pinned announcements support optional photos and formatted full text',async({page,browser})=>{
 const name=await setup(page),encoded=encodeURIComponent(name),endpoint=`/api/wall/${encoded}/posts`;
 await changed(page,()=>page.getByLabel('Wall enabled',{exact:true}).check());
 const post=(await(await page.request.post(`/api/wall/${encoded}`,{multipart:{authorName:'Organizers',text:'Announcement',file:{name:'photo.png',mimeType:'image/png',buffer:png}}})).json()).data;
 for(const [action,revision] of [['approve',0],['pin',1]])expect((await(await page.request.post(endpoint,{data:{action,postId:post.id,revision}})).json()).status).toBe(200);
 await page.reload();const card=page.getByTestId('wall-post-'+post.id);
 await card.getByRole('button',{name:'Edit post',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Edit post'}),editor=dialog.getByRole('textbox',{name:'Post text',exact:true});
 await editor.fill('Schedule');await editor.selectText();await dialog.getByRole('button',{name:'Post text: Bold',exact:true}).click();
 await editor.press('End');await editor.press('Enter');
 await dialog.getByRole('button',{name:'Post text: Bold',exact:true}).click();
 await dialog.getByRole('button',{name:'Post text: Bullets',exact:true}).click();
 await dialog.getByRole('button',{name:'Post text: Italic',exact:true}).click();
 const detail='Bring your laptop and charger. '.repeat(45);await editor.pressSequentially(detail);
 await dialog.getByRole('button',{name:'Remove image',exact:true}).click();
 await changed(page,()=>dialog.getByRole('button',{name:'Save post',exact:true}).click());await expect(dialog).toHaveCount(0);
 const saved=(await(await page.request.get(endpoint)).json()).data.posts[0];
 expect(saved.imageUrl).toBe('');expect(saved.pinned).toBe(true);expect(saved.richText.some(block=>block.type==='bullet')).toBe(true);
 expect(saved.richText.some(block=>block.runs.some(run=>run.bold))).toBe(true);expect(saved.richText.some(block=>block.runs.some(run=>run.italic))).toBe(true);
 const guest=await browser.newContext({viewport:{width:1920,height:1080}});try{
  const wall=await guest.newPage();await wall.goto(`/${encoded}/wall`);
  const publicCard=wall.locator(`[data-wall-post-id="${post.id}"]`).first();
  await expect(publicCard).toContainText(detail.trim());await expect(publicCard.locator('img')).toHaveCount(0);
  await expect(publicCard.getByRole('button',{name:'Read full post'})).toHaveCount(0);
  await expect(publicCard.locator('.font-bold').filter({hasText:'Schedule'})).toBeVisible();
  expect((await publicCard.boundingBox()).width).toBeGreaterThan(1500);
  const copy=publicCard.locator('.wall-formatted-copy');
  expect(await copy.evaluate(element=>parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(20);
  expect(await copy.evaluate(element=>element.scrollHeight<=element.clientHeight+1)).toBe(true);
  await wall.setViewportSize({width:390,height:844});
  expect(await publicCard.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
 }finally{await guest.close();}
 await card.getByRole('button',{name:'Edit post',exact:true}).click();
 await dialog.getByLabel('Photo (optional)',{exact:true}).setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:png});
 await expect(dialog.getByAltText('Post photo preview')).toBeVisible();
 await changed(page,()=>dialog.getByRole('button',{name:'Save post',exact:true}).click());
 await expect(dialog).toHaveCount(0);await expect(card.locator('img')).toBeVisible();
});

test('X cards and hashtags are clickable while plain HTML stays escaped',async({page,context})=>{
 const name=await setup(page),encoded=encodeURIComponent(name),endpoint=`/api/wall/${encoded}/posts`;
 await changed(page,()=>page.getByLabel('Wall enabled',{exact:true}).check());
 const post=(await(await page.request.post(`/api/wall/${encoded}`,{data:{text:'Fixture'}})).json()).data;
 await page.request.post(endpoint,{data:{action:'approve',postId:post.id,revision:0}});
 const source='https://x.com/Jemmotar/status/2120603599218569529';
 await page.route(`**/api/wall/${encoded}*`,async route=>{
  const response=await route.fetch(),body=await response.json();
  if(body.data?.posts)body.data.posts=body.data.posts.map(p=>({...p,platform:'x',authorName:'Jemmotar',sourceUrl:source,text:'Hello #atthack https://example.org/info <script>alert(1)</script>'}));
  await route.fulfill({response,json:body});
 });
 await context.route('https://x.com/**',route=>route.fulfill({contentType:'text/plain',body:'External X page fixture'}));
 await page.goto(`/${encoded}/wall`);
 const card=page.locator(`[data-wall-copy="1"] [data-wall-post-id="${post.id}"]`);
 const hashtag=card.getByRole('link',{name:'#atthack',exact:true});
 await expect(hashtag).toHaveAttribute('href','https://x.com/hashtag/atthack');
 await expect(hashtag).toHaveCSS('text-decoration-line','underline');
 await expect(card.getByRole('link',{name:'https://example.org/info',exact:true})).toHaveAttribute('href','https://example.org/info');
 await expect(card.locator('script')).toHaveCount(0);await expect(card).toContainText('<script>alert(1)</script>');
 await page.locator('[data-wall-viewport]').dispatchEvent('pointermove');
 let popupPromise=page.waitForEvent('popup');await hashtag.click();let popup=await popupPromise;await popup.waitForURL('https://x.com/hashtag/atthack');await popup.close();
 await page.locator('[data-wall-viewport]').dispatchEvent('pointermove');
 popupPromise=page.waitForEvent('popup');await card.click({position:{x:20,y:20}});popup=await popupPromise;await popup.waitForURL(source);await popup.close();
 const copies=page.locator('[data-wall-copy="2"]');
 if(await copies.count())await expect(copies.getByRole('link',{name:'#atthack',exact:true,includeHidden:true})).toHaveAttribute('tabindex','-1');
});
