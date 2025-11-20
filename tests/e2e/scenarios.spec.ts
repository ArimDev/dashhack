import { test, expect } from '@playwright/test';

const EVENT_NAME = `test-event-${Date.now()}`;
const PASSWORD = 'password123';

test.describe('DashHack Scenarios', () => {

  // 1. Global Setup: Register and Login once for this worker
  test.beforeAll(async ({ request }) => {
    // Create the event (User)
    const createRes = await request.post('/api/auth/create', {
      data: { username: EVENT_NAME, password: PASSWORD }
    });
    expect(createRes.ok()).toBeTruthy();
  });

  // 2. Before each test: Log in and go to the team page
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login flow
    if (await page.locator('input[type="username"]').isVisible()) {
        await page.locator('input[type="username"]').fill(EVENT_NAME);
        await page.locator('input[type="password"]').fill(PASSWORD);
        await page.getByRole('button', { name: /Open Dashboard|Create/i }).click();
    }
    
    // Ensure we are on the teams page
    await expect(page).toHaveURL(new RegExp(`/app/${EVENT_NAME}/teams`));
  });

  test('Create a new Team', async ({ page }) => {
    const newTeamName = `Team-${Date.now()}`;

    // Open Add Team Dialog (FAB)
    await page.locator('button.fixed.bg-bluey-500').click();

    // Fill form
    await page.locator('input[name="teamName"]').fill(newTeamName);
    await page.locator('textarea[name="teamDescription"]').fill('E2E Test Description');
    
    // Submit
    await page.getByRole('button', { name: 'Add Team' }).click();

    // Verify Team Card appears
    await expect(page.getByRole('heading', { name: newTeamName })).toBeVisible();
  });

  test('Manage Sticky Notes (Add, Edit, Delete)', async ({ page }) => {
    // Ensure at least one team exists (reuses team from previous test or creates one)
    const teamName = `Note-Team-${Date.now()}`;
    await page.locator('button.fixed.bg-bluey-500').click();
    await page.locator('input[name="teamName"]').fill(teamName);
    await page.getByRole('button', { name: 'Add Team' }).click();

    // Find the team card
    const card = page.locator('.rounded-2xl', { has: page.getByText(teamName) });

    // 1. Open Notes Panel
    await card.getByTitle('Toggle Sticky Notes').click();
    await expect(card.getByText('Team Notes')).toBeVisible();

    // 2. Add a Note
    await card.getByRole('button', { name: 'Add Note' }).click();
    
    // 3. Edit the Note (it's the last one in the grid)
    const note = card.locator('.sticky-note').last();
    await note.locator('textarea').fill('Buy servers');
    await note.locator('textarea').blur(); // Trigger save

    // 4. Verify Persistence (Reload page)
    await page.reload();
    const cardAfterReload = page.locator('.rounded-2xl', { has: page.getByText(teamName) });
    await cardAfterReload.getByTitle('Toggle Sticky Notes').click();
    await expect(cardAfterReload.getByDisplayValue('Buy servers')).toBeVisible();

    // 5. Delete the Note
    await cardAfterReload.locator('.sticky-note').last().getByTitle('Delete note').click();
    await expect(cardAfterReload.getByDisplayValue('Buy servers')).not.toBeVisible();
  });

  test.describe('GitHub Graph States', () => {
    // Setup a team specifically for graph testing
    const graphTeamName = 'Graph-Test-Team';
    
    test.beforeEach(async ({ page }) => {
        // Ensure the team exists with a dummy repo URL
        // We don't need a real repo because we mock the network response
        const addBtn = page.locator('button.fixed.bg-bluey-500');
        if (await addBtn.isVisible()) {
             await addBtn.click();
             await page.locator('input[name="teamName"]').fill(graphTeamName);
             await page.locator('input[name="teamGithub"]').fill('https://github.com/mock/repo');
             await page.getByRole('button', { name: 'Add Team' }).click();
        }
    });

    test('Graph loads successfully', async ({ page }) => {
        // MOCK: Intercept the API call and return success data
        await page.route('*/**/api/github/series*', async route => {
            const json = {
                status: 200,
                commits: [10, 20, 5, 0],
                diff: [100, 200, 50, 0],
                hours: ["10:00", "11:00", "12:00", "13:00"]
            };
            await route.fulfill({ json });
        });

        const card = page.locator('.rounded-2xl', { has: page.getByText(graphTeamName) });
        await card.getByTitle('Toggle Activity Graph').click();

        // Verify the chart renders (ApexCharts creates a .apexcharts-canvas element)
        await expect(card.locator('.apexcharts-canvas')).toBeVisible();
    });

    test('Graph handles "Repo Not Found" error', async ({ page }) => {
        // MOCK: Return a 404/500 error from your backend
        await page.route('*/**/api/github/series*', async route => {
            const json = {
                status: 404,
                message: "Repository not found or private"
            };
            await route.fulfill({ json });
        });

        const card = page.locator('.rounded-2xl', { has: page.getByText(graphTeamName) });
        await card.getByTitle('Toggle Activity Graph').click();

        // Verify the error message is displayed in the UI
        await expect(card.getByText('Unable to load chart data: Repository not found or private')).toBeVisible();
    });

    test('Graph handles "Missing Token" or "Rate Limit"', async ({ page }) => {
        // MOCK: Return a specific error message
        await page.route('*/**/api/github/series*', async route => {
            const json = {
                status: 401,
                message: "Missing GitHub token!"
            };
            await route.fulfill({ json });
        });

        const card = page.locator('.rounded-2xl', { has: page.getByText(graphTeamName) });
        await card.getByTitle('Toggle Activity Graph').click();

        // Verify the specific error message
        await expect(card.getByText('Unable to load chart data: Missing GitHub token!')).toBeVisible();
    });
  });
});