import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWMwaHxg0PiAAUIBACkqBkV72qJcAAAAAElFTkSuQmCC', 'base64');
async function setup(page) {
    const name = `Uploads ${randomUUID()}`, encoded = encodeURIComponent(name), password = 'password123';
    for (const path of ['create', 'login']) expect((await (await page.request.post(`/api/auth/${path}`, { data: { username: name, password } })).json()).status).toBe(200);
    expect((await (await page.request.post(`/api/wall/${encoded}/posts`, { data: { action: 'updateSettings', settings: { enabled: true }, revision: 0 } })).json()).status).toBe(200);
    return { name, encoded };
}

test('phone picker accepts a photo above the old limit, compresses it, and clipboard paste is previewed/removable', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { encoded } = await setup(page);
    await page.goto(`/${encoded}/wall/upload`);
    const picker = page.getByLabel('Add a photo', { exact: false });
    await expect(picker).toHaveAttribute('accept', /image\/\*/);
    expect(await picker.getAttribute('accept')).not.toContain('video');
    expect(await picker.getAttribute('capture')).toBeNull(); // Keep Photo Library available on iPhone.
    const large = Buffer.alloc(6 * 1024 * 1024); png.copy(large);
    await picker.setInputFiles({ name: 'large-phone-photo.png', mimeType: 'image/png', buffer: large });
    await expect(page.getByRole('status')).toContainText('Photo ready · 1 KiB');
    await expect(page.getByAltText('Upload preview')).toBeVisible();
    const saved = page.waitForResponse(r => r.url().endsWith(`/api/wall/${encoded}`) && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Submit for approval' }).click();
    const response = await saved;

    const body = await response.json(); expect(body.status).toBe(200);
    const media = await page.request.get(body.data.imageUrl);
    expect(media.headers()['content-type']).toContain('image/webp');
    expect((await media.body()).toString('ascii', 8, 12)).toBe('WEBP');
    await page.getByRole('button', { name: 'Upload another' }).click();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.evaluate(async bytes => {
        const blob = new Blob([Uint8Array.from(bytes)], { type: 'image/png' });
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }, [...png]);
    await page.getByRole('button', { name: 'Paste photo', exact: true }).click();
    await expect(page.getByAltText('Upload preview')).toBeVisible();
    await page.getByRole('button', { name: 'Remove attachment' }).click();
    await expect(page.getByAltText('Upload preview')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Submit for approval' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Your story' }).evaluate((element, bytes) => {
        const data = new DataTransfer(); data.items.add(new File([Uint8Array.from(bytes as number[])], 'pasted.png', { type: 'image/png' }));
        element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, [...png]);
    await expect(page.getByAltText('Upload preview')).toBeVisible();
    await page.getByRole('button', { name: 'Remove attachment' }).click();
    await picker.setInputFiles({ name: 'too-big.png', mimeType: 'image/png', buffer: Buffer.alloc(25 * 1024 * 1024 + 1) });
    await expect(page.getByRole('status')).toContainText('25 MiB');
    await expect(page.getByRole('button', { name: 'Submit for approval' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('direct API uploads cannot bypass WebP conversion, byte limits, field restrictions or origin checks', async ({ page }) => {
    const { encoded } = await setup(page);
    const url = `/api/wall/${encoded}`;
    const fake = await page.request.post(url, { multipart: { file: { name: 'fake.webp', mimeType: 'image/webp', buffer: Buffer.from('RIFF0000WEBPfake') } } });
    expect((await fake.json()).status).toBe(415);
    expect((await (await page.request.post(url, { multipart: { file: { name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.from('0000ftypisom0000') } } })).json()).status).toBe(415);
    const large = process.env.PLAYWRIGHT_LARGE_UPLOADS ? Buffer.alloc(1.5 * 1024 * 1024) : Buffer.from(png); png.copy(large);
    const saved = (await (await page.request.post(url, { multipart: { file: { name: 'raw.png', mimeType: 'image/png', buffer: large } } })).json());
    expect(saved.status).toBe(200);
    const media = await page.request.get(saved.data.imageUrl);
    expect(media.headers()['content-type']).toContain('image/webp');
    expect((await media.body()).length).toBeLessThan(1024 * 1024);
    expect((await (await page.request.post(url, { data: { text: 'External', imageUrl: 'https://example.com/unbounded.svg' } })).json()).status).toBe(400);
    expect((await (await page.request.post(url, { headers: { Origin: 'https://other-site.example' }, data: { text: 'Cross site' } })).json()).status).toBe(403);
    const moderation = (await (await page.request.get(`${url}/posts`)).json()).data;
    expect(moderation.posts).toHaveLength(1);
    expect(moderation.storage.eventBytes).toBeLessThan(1024 * 1024);
    expect(moderation.storage.totalLimit).toBe(32 * 1024 * 1024);
    await page.goto(`/app/${encoded}/social-wall`);
    await expect(page.getByTestId('wall-storage-usage')).toContainText('Pending and rejected');
});

test('submission rate limit returns a useful retry hint and only accepted posts persist', async ({ page }) => {
    const { encoded } = await setup(page);
    for (let i = 0; i < 5; i++) expect((await (await page.request.post(`/api/wall/${encoded}`, { data: { text: `Attempt ${i}` } })).json()).status).toBe(200);
    const blocked = await page.request.post(`/api/wall/${encoded}`, { data: { text: 'Too many' } });
    expect((await blocked.json()).status).toBe(429);
    expect(blocked.headers()['retry-after']).toBe('60');
    expect((await (await page.request.get(`/api/wall/${encoded}/posts`)).json()).data.posts).toHaveLength(5);
});


test('production rejects oversized raw multipart bodies before parsing', async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_LARGE_UPLOADS, 'Nuxt dev proxy stalls raw multi-megabyte bodies; run with PLAYWRIGHT_LARGE_UPLOADS=1 against production.');
    const { encoded } = await setup(page);
    const response = await page.request.post(`/api/wall/${encoded}`, { multipart: { file: { name: 'too-big.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 32769) } } });
    expect((await response.json()).status).toBe(413);
    expect((await (await page.request.get(`/api/wall/${encoded}/posts`)).json()).data.posts).toHaveLength(0);
});
