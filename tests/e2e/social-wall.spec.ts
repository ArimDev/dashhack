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
    await upload.getByRole('button',{ name:'Wall display settings', exact:true }).click();
    await upload.getByRole('switch',{ name:'Enable auto-scroll layout' }).uncheck();
    await expect(upload.getByText('Náš první prototyp!',{ exact:true })).toBeVisible();
    await expect(upload.getByRole('button',{ name:/Switch to .* mode/ })).toBeVisible();
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
  const input=page.getByPlaceholder('#hackathon #buildinpublic #dashhack');
  await input.fill('#junior2026');
  const save=page.waitForResponse(r => r.url().includes('/api/auth/update') && r.request().method()==='POST');
  await input.blur();expect((await (await save).json()).status).toBe(200);
  await page.reload();await expect(input).toHaveValue('#junior2026');
  const publicBody=await (await page.request.get(`/api/wall/${encoded}`)).json();
  expect(JSON.stringify(publicBody)).not.toContain('xQuery');
  expect(JSON.stringify(publicBody)).not.toContain('Bearer');
});


test('projector wall keeps QR in the top corner and display controls collapsed', async ({ page }) => {
  const name = await setup(page), encoded = encodeURIComponent(name);
  await changed(page, () => page.getByLabel('Wall enabled', { exact: true }).check());
  const post = (await (await page.request.post(`/api/wall/${encoded}`, { data: { text: 'Projector display' } })).json()).data;
  expect((await (await page.request.post(`/api/wall/${encoded}/posts`, { data: { action: 'approve', postId: post.id, revision: 0 } })).json()).status).toBe(200);
  // Avoid an external QR service dependency while verifying the displayed URL and geometry.
  await page.route('https://api.qrserver.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`/${encoded}/wall`);
    const cog = page.getByRole('button', { name: 'Wall display settings', exact: true });
    await expect(cog).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('switch')).toHaveCount(0);
    const qr = page.getByRole('img', { name: 'Scan to upload a post' });
    await expect(qr).toBeVisible();
    expect(new URL(await qr.getAttribute('src')).searchParams.get('data')).toBe(new URL(`/${encoded}/wall/upload`, page.url()).href);
    const qrBox = await qr.boundingBox(), feed = await page.locator('section').boundingBox(), cogBox = await cog.boundingBox();
    expect(qrBox.x).toBeGreaterThan(viewport.width * 0.8);
    expect(qrBox.y).toBeLessThan(40);
    expect(qrBox.y + qrBox.height).toBeLessThanOrEqual(feed.y);
    expect(feed.height).toBeGreaterThan(viewport.height * 0.75);
    expect(cogBox.y).toBeGreaterThan(viewport.height - 80);
    await cog.click();
    await expect(page.getByRole('switch', { name: 'Enable auto-scroll layout' })).toBeChecked();
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
    await page.getByRole('heading', { name }).click();
    await expect(cog).toHaveAttribute('aria-expanded', 'false');
  }
});
