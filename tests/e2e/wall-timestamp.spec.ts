import { test, expect } from '@playwright/test';

test.use({ timezoneId: 'Europe/Prague' });

test('wall timestamps use local days and update after midnight without replacing cards', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-12T22:59:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const createdAt = '2026-11-12T12:05:00Z';
  await page.route('**/api/wall/**', route => route.fulfill({ json: { status: 200, canEdit: false, data: {
    wall: { enabled: true, publicUploadEnabled: false, idleWaitSeconds: 5, scrollSpeed: 40, revision: 0 },
    posts: [{ id: 'timestamp-fixture', platform: 'x', authorName: 'Student', handle: '@student', text: 'Local time test', createdAt }], total: 1, hasMore: false,
  } } }));
  await page.goto('/Timestamp-fixture/wall');
  const stamp = page.locator('[data-wall-copy="1"] time');
  const today = await page.evaluate(value => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value)), createdAt);
  await expect(stamp).toHaveText(today);
  await expect(stamp).toHaveAttribute('datetime', createdAt);
  const card = await page.locator('[data-wall-copy="1"] article').elementHandle();
  await page.clock.setFixedTime(new Date('2026-11-12T23:01:00Z'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(stamp).toHaveText('Yesterday');
  expect(await card!.evaluate(node => node.isConnected)).toBe(true);
});
