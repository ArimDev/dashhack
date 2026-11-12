import { test, expect } from '@playwright/test';
import { EVENT_URI_NAME } from '../../src/shared/eventRoutes.js';

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
    const tagBox = (await hashtag.boundingBox())!, titleBox = (await page.getByRole('heading', { name: 'AT&T Hackathon Junior 2026', exact: true }).boundingBox())!;
    expect(tagBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height);
    expect(tagBox.y + tagBox.height).toBeLessThan(viewport.height);
    expect(tagBox.x).toBeGreaterThanOrEqual(0);
  }
  await page.goto('/Unrelated-event/wall');
  await expect(page.getByTestId('wall-posting-hashtag')).toHaveCount(0);
});
