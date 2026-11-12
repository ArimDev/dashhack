import { test, expect } from '@playwright/test';
import { WALL_LAYOUT_DEFAULTS } from '../../src/shared/wallDisplay.js';

test('two-panel mosaic saves layout, keeps full text and original photo proportions', async ({ page }) => {
  const event = 'Layout-regression';
  const wall = { ...WALL_LAYOUT_DEFAULTS, enabled: true, publicUploadEnabled: false, revision: 1, idleWaitSeconds: 5, scrollSpeed: 40 };
  const posts = Array.from({ length: 6 }, (_, i) => ({
    id: `layout-${i}`, platform: i % 2 ? 'x' : 'instagram', authorName: 'Student', textDisplay: {enabled:false,limit:100},
    text: 'Full text '.repeat(30) + 'END OF POST', imageUrl: `https://wall-media.invalid/${i}.svg`, videoUrl: '', sourceUrl: '',
  }));
  await page.route('https://wall-media.invalid/**', route => {
    const i = Number(new URL(route.request().url()).pathname.slice(1).split('.')[0]);
    return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="${i % 2 ? 150 : 600}"><rect width="100%" height="100%" fill="red"/></svg>` });
  });
  await page.route(`**/api/wall/${event}**`, route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      expect(body.action).toBe('setLayout');
      expect(body.revision).toBe(wall.revision);
      Object.assign(wall, body.settings); wall.revision++;
      return route.fulfill({ json: { status: 200, data: { wall } } });
    }
    return route.fulfill({ json: { status: 200, canEdit: true, data: { wall, posts, total: posts.length, hasMore: false } } });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/${event}/wall`);
  const feed = page.locator('[data-wall-copy="1"]');
  await expect(feed.locator('article')).toHaveCount(6);
  await expect(feed.locator('article').first()).toContainText('END OF POST');
  await page.getByRole('button', { name: 'Wall display settings', exact: true }).click();
  await page.getByLabel('Panels across').selectOption('2');
  await expect.poll(() => wall.panelColumns).toBe(2);
  await page.getByLabel('Space between panels (px)').fill('0');
  await page.getByLabel('Space between panels (px)').press('Tab');
  await expect.poll(() => wall.panelGap).toBe(0);
  await page.getByLabel('Panel corner radius (px)').fill('0');
  await page.getByLabel('Panel corner radius (px)').press('Tab');
  await expect.poll(() => wall.panelRadius).toBe(0);
  await page.getByRole('button', { name: 'Wall display settings', exact: true }).click();
  await expect.poll(() => feed.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(2);
  await expect.poll(() => feed.locator('img').first().evaluate((e: HTMLImageElement) => e.naturalHeight)).toBe(600);
  const image = await feed.locator('img').first().boundingBox();
  expect(image!.height / image!.width).toBeCloseTo(2, 2);
  await expect.poll(() => feed.evaluate(e => {
    const cards = [...e.querySelectorAll('article')].map(c => c.getBoundingClientRect());
    return cards.slice(2).every(card => cards.some(above => above.y < card.y && Math.abs(above.x - card.x) < 1 && Math.abs(above.bottom - card.y) <= 1));
  })).toBe(true);
  await page.reload();
  await expect.poll(() => feed.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => feed.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(1);
});
