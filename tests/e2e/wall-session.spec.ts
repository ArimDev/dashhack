import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('24-hour login persists to another wall tab and browser context; logout refreshes permission', async ({ page, browser }) => {
  const name = `Session-${randomUUID()}`, password = 'password123';
  await page.request.post('/api/auth/create', { data: { username: name, password } });
  await page.goto(`/${name}/wall`);
  const cog = page.getByRole('button', { name: 'Wall display settings', exact: true });
  await expect(cog).toBeVisible(); await cog.click();
  await expect(page.getByText('Changes apply to this screen until you reload.')).toBeVisible();
  const loginTab = await page.context().newPage();
  await loginTab.goto('/');
  await loginTab.getByTestId('username-input').fill(name);
  await expect(loginTab.getByTestId('login-button')).toHaveText('Open Dashboard');
  await loginTab.getByTestId('password-input').fill(password);
  await loginTab.getByTestId('login-button').click();
  await expect(loginTab.locator('#dashboard-content')).toBeVisible();
  for (const cookie of (await page.context().cookies()).filter(cookie => ['session', 'sessionExists'].includes(cookie.name))) {
    expect(cookie.expires - Date.now() / 1000).toBeGreaterThan(24 * 3600 - 60);
    expect(cookie.expires - Date.now() / 1000).toBeLessThanOrEqual(24 * 3600);
  }
  await page.bringToFront();
  await expect(cog).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Changes apply to this screen until you reload.')).toHaveCount(0);
  const restored = await browser.newContext({ storageState: await page.context().storageState(), ignoreHTTPSErrors: true });
  try {
    const reopened = await restored.newPage();
    await reopened.goto(`/${name}/wall`);
    await expect(reopened.getByRole('button', { name: 'Wall display settings', exact: true })).toBeVisible();
  } finally { await restored.close(); }
  await loginTab.bringToFront();
  await loginTab.getByRole('button', { name: 'Logout', exact: true }).click();
  await loginTab.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(loginTab.getByTestId('login-button')).toBeVisible();
  await page.bringToFront();
  await expect(cog).toBeVisible();
  await expect(page.getByText('Changes apply to this screen until you reload.')).toBeVisible({ timeout: 5000 });
  const data = await (await page.request.get(`/api/wall/${name}`)).json();
  expect(data.canEdit).toBe(false);
});
