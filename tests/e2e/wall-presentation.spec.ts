import { test, expect } from '@playwright/test';
import { EVENT_URI_NAME } from '../../src/shared/eventRoutes.js';

test('guests can use wall display controls without changing shared settings, including after feed refresh', async ({ page }) => {
  await page.clock.install(); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://api.qrserver.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" />' }));
  let writes = 0, reads = 0;
  await page.route('**/api/wall/**', route => {
    if (route.request().method() !== 'GET') writes++; else reads++;
    return route.fulfill({ json: { status: 200, canEdit: false, data: {
      wall: { enabled: true, publicUploadEnabled: true, panelColumns: 2, panelGap: 16, idleWaitSeconds: 5, scrollSpeed: 40, revision: 0 },
      posts: [{ id: 'public-controls', platform: 'manual', text: 'Public display controls' }], total: 1, hasMore: false,
    } } });
  });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/Public-controls/wall');
  const cog = page.getByRole('button', { name: 'Wall display settings', exact: true }); await cog.click();
  await expect(page.getByText('Changes apply to this screen until you reload.')).toBeVisible();
  const speed = page.getByLabel('Scroll speed', { exact: true }); await speed.selectOption('80');
  await page.getByRole('combobox', { name: 'Panels across', exact: true }).selectOption('3');
  await expect.poll(() => page.locator('[data-wall-copy="1"]').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3);
  await page.clock.fastForward(13000); await expect.poll(() => reads).toBeGreaterThan(1);
  await expect(speed).toHaveValue('80'); await expect(page.getByRole('combobox', { name: 'Panels across', exact: true })).toHaveValue('3');
  const scroll = page.getByRole('switch', { name: 'Enable auto-scroll layout' }); await scroll.check(); await expect(scroll).toBeChecked();
  await scroll.uncheck(); await expect(page.locator('[data-wall-copy]')).toHaveCount(1);
  await page.getByRole('button', { name: /Switch to .* mode/ }).click();
  await page.getByRole('button', { name: 'Expand QR code', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Share a moment' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(cog).toBeFocused(); expect(writes).toBe(0);
});

test('pinned organizer copy uses the same compact spacing as X without blank rows before media', async ({ page }) => {
  const block = (text: string) => ({ type: 'paragraph', runs: [{ text, bold: false, italic: false }] });
  const imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWMwaHxg0PiAAUIBACkqBkV72qJcAAAAAElFTkSuQmCC';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('**/api/wall/**', route => route.fulfill({ json: { status: 200, canEdit: false, data: {
    wall: { enabled: true, publicUploadEnabled: false, panelColumns: 2, idleWaitSeconds: 5, scrollSpeed: 40, revision: 0 },
    posts: [
      { id: 'organizer-spacing', platform: 'manual', pinned: true, text: 'First paragraph\n\nSecond paragraph', richText: [block('First paragraph'), block(''), block('Second paragraph'), block(''), block(' ')], imageUrl },
      { id: 'x-spacing', platform: 'x', text: 'First paragraph\nSecond paragraph', richText: [block('First paragraph'), block('Second paragraph')], imageUrl },
    ], total: 2, hasMore: false,
  } } }));
  await page.goto('/Spacing-fixture/wall');
  const organizer = page.locator('[data-wall-post-id="organizer-spacing"]'), twitter = page.locator('[data-wall-post-id="x-spacing"]');
  await expect(organizer.locator('.wall-formatted-copy > div')).toHaveCount(2);
  const organizerCopy = organizer.locator('.wall-formatted-copy'), twitterCopy = twitter.locator('.wall-formatted-copy');
  await expect(organizerCopy).toHaveCSS('line-height', await twitterCopy.evaluate(el => getComputedStyle(el).lineHeight));
  expect((await organizerCopy.boundingBox())!.height).toBe((await twitterCopy.boundingBox())!.height);
  const lastLine = (await organizerCopy.locator(':scope > div').last().boundingBox())!;
  const media = (await organizer.locator('img').boundingBox())!;
  expect(media.y - lastLine.y - lastLine.height).toBeLessThanOrEqual(20);
  await expect(organizer.locator('[data-read-post]')).toHaveCount(0);
});

test('event hashtag fits the title rail on desktop, phone and short landscape without branding other events', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/wall/**', route => route.fulfill({ json: {
    status: 200, canEdit: false, data: {
      wall: { title: 'AT&T Hackathon Junior 2026', enabled: true, publicUploadEnabled: false, idleWaitSeconds: 5, scrollSpeed: 40, revision: 0 },
      posts: [{ id: 'header-fixture', platform: 'manual', text: 'Event post' }], total: 1, hasMore: false,
    },
  } }));
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`/${encodeURIComponent(EVENT_URI_NAME)}/wall`);
    const hashtag = page.getByTestId('wall-posting-hashtag');
    await expect(hashtag).toHaveText('#atthack');
    await expect(hashtag).toHaveCSS('font-size', await page.getByRole('heading', { name: 'AT&T Hackathon Junior 2026', exact: true }).evaluate(el => getComputedStyle(el).fontSize));
    const tagBox = (await hashtag.boundingBox())!, titleBox = (await page.getByRole('heading', { name: 'AT&T Hackathon Junior 2026', exact: true }).boundingBox())!;
    expect(tagBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height);
    expect(tagBox.y + tagBox.height).toBeLessThan(viewport.height);
    expect(tagBox.x).toBeGreaterThanOrEqual(0);
  }
  await page.goto('/Unrelated-event/wall');
  await expect(page.getByTestId('wall-posting-hashtag')).toHaveCount(0);
});
