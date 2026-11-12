import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('collector status badges and accessible switches fit narrow phones', async ({ page }) => {
  const name = `Collector-phone-${randomUUID()}`, password = 'password123';
  await page.request.post('/api/auth/create', { data: { username: name, password } });
  await page.request.post('/api/auth/login', { data: { username: name, password } });
  await page.route(`**/api/wall/${name}/posts`, async route => {
    const response = await route.fetch(), data = await response.json();
    data.data.xConfigured = true; data.data.instagramConfigured = true;
    await route.fulfill({ json: data });
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/app/${name}/settings`);
    for (const platform of ['X', 'Instagram']) {
      const form = page.locator('form').filter({ has: page.getByRole('heading', { name: `${platform} collector`, exact: true }) });
      await expect(form.getByText('Polling OFF', { exact: true })).toBeVisible();
      const toggle = form.getByRole('switch', { name: `Automatic ${platform} polling` });
      await expect(toggle).toBeEnabled();
      await toggle.focus(); await expect(toggle).toBeFocused();
      expect(await toggle.locator('..').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      expect(await form.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    }
  }
});

test('both collectors can stop while initial status is loading and ignore its stale response', async ({ page }) => {
  const name = `Collector-loading-${randomUUID()}`, password = 'password123';
  await page.request.post('/api/auth/create', { data: { username: name, password } });
  await page.request.post('/api/auth/login', { data: { username: name, password } });
  const path = `/api/wall/${name}/posts`;
  await page.request.post(path, { data: { action: 'updateSettings', revision: 0, settings: { xEnabled: true, instagramEnabled: true } } });
  let release;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${path}`, async route => {
    if (route.request().method() === 'GET') {
      const response = await route.fetch(); await gate; return route.fulfill({ response });
    }
    await route.continue();
  });
  await page.goto(`/app/${name}/settings`);
  await expect(page.getByRole('switch', { name: 'Automatic X polling' })).toBeDisabled();
  await expect(page.getByRole('switch', { name: 'Automatic Instagram polling' })).toBeDisabled();
  await page.getByRole('button', { name: 'Stop X polling', exact: true }).click();
  await page.getByRole('button', { name: 'Stop Instagram polling', exact: true }).click();
  release();
  for (const platform of ['X', 'Instagram']) {
    const form = page.locator('form').filter({ has: page.getByRole('heading', { name: `${platform} collector`, exact: true }) });
    await expect(form.getByText('Polling OFF', { exact: true })).toBeVisible();
    await expect(form.getByRole('switch')).not.toBeChecked();
    await expect(form.getByRole('button', { name: `Stop ${platform} polling`, exact: true })).toHaveCount(0);
  }
  const saved = (await (await page.request.get(path)).json()).data.wall;
  expect(saved.xEnabled).toBe(false); expect(saved.instagramEnabled).toBe(false);
});
