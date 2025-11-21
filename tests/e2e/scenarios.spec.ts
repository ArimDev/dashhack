import { test, expect } from '@playwright/test';

const EVENT_NAME = `test-user-${Date.now()}`;
const PASSWORD = 'password123';

test.describe('DashHack Features', () => {

  // 1. Login/Register Helper
  // We remove beforeAll to make tests self-contained and robust against DB state
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // If we are on the login page (username input is visible)
    if (await page.getByTestId('username-input').isVisible()) {
        await page.getByTestId('username-input').fill(EVENT_NAME);
        await page.getByTestId('password-input').fill(PASSWORD);

        // Wait for the API check to likely finish
        // The button text determines our action
        const loginBtn = page.getByTestId('login-button');
        
        // We wait for the button to settle on specific text. 
        // Ideally, since we just generated a unique ID, it SHOULD be "Create New Event".
        // But if the test retries, it might be "Open Dashboard".
        
        // Let's wait for the button to be enabled/visible
        await expect(loginBtn).toBeVisible();
        
        // Check text content
        const btnText = await loginBtn.textContent();
        
        if (btnText?.includes('Create New Event')) {
            // Flow: Register -> Then Login
            await loginBtn.click(); 
            // The app might auto-login or require a second click depending on your implementation.
            // Based on your index.vue: "eventTaken.value = true... submitText.value = 'Open Dashboard'"
            // It changes state but doesn't navigate immediately on the first "Create" click if I recall correctly?
            // Let's look at your code:
            // if (eventFree.value) { ... create API ... submitText.value = "Open Dashboard" ... login API ... navigateTo }
            // So one click SHOULD do it if eventFree is true.
        } else {
            // Flow: Login
            await loginBtn.click();
        }
    }
    
    // Verification: We must end up on the dashboard
    await expect(page).toHaveURL(new RegExp(`/app/${EVENT_NAME}/teams`), { timeout: 10000 });
  });

  test('Create a Team', async ({ page }) => {
    const teamName = `DevOps-${Date.now()}`;
    
    // Click FAB using test id
    await page.getByTestId('add-team-fab').click();
    
    // Fill Form
    await page.getByTestId('team-name-input').fill(teamName);
    await page.getByTestId('team-github-input').fill('https://github.com/example/repo');
    await page.getByTestId('team-desc-input').fill('Testing with Playwright');
    
    await page.getByTestId('submit-team-btn').click();

    // Verify Team Card appears
    await expect(page.getByTestId(`team-card-${teamName}`)).toBeVisible();
  });

  test('Sticky Notes: Add, Edit, Delete', async ({ page }) => {
    const teamName = `NoteTeam-${Date.now()}`;
    
    // Create dedicated team
    await page.getByTestId('add-team-fab').click();
    await page.getByTestId('team-name-input').fill(teamName);
    await page.getByTestId('submit-team-btn').click();

    const card = page.getByTestId(`team-card-${teamName}`);

    // Open Notes Section
    await card.getByTestId('toggle-notes-btn').click();

    // Add Note
    await card.getByTestId('add-note-btn').click();

    // Edit the Note (Last note in the list)
    const noteInput = card.getByTestId('note-content').last();
    await noteInput.fill('Deploy to production on Friday');
    await noteInput.blur(); // Trigger save

    // Reload to verify persistence
    await page.reload();
    const cardReloaded = page.getByTestId(`team-card-${teamName}`);
    await cardReloaded.getByTestId('toggle-notes-btn').click();
    await expect(cardReloaded.getByDisplayValue('Deploy to production on Friday')).toBeVisible();

    // Delete the Note
    const specificNote = cardReloaded.locator('.sticky-note', { has: page.getByDisplayValue('Deploy to production on Friday') });
    await specificNote.getByTestId('delete-note-btn').click();
        
    await expect(cardReloaded.getByDisplayValue('Deploy to production on Friday')).not.toBeVisible();
  });

  // --- GITHUB API MOCKING TESTS ---
  test.describe('GitHub Activity Graph', () => {
    const teamName = 'GitHub-Test-Team';

    test.beforeEach(async ({ page }) => {
       // Check if team exists, if not create it
       // Note: Using a more specific selector to avoid false positives
       if (!await page.getByTestId(`team-card-${teamName}`).isVisible()) {
           await page.getByTestId('add-team-fab').click();
           await page.getByTestId('team-name-input').fill(teamName);
           await page.getByTestId('team-github-input').fill('https://github.com/mock/repo');
           await page.getByTestId('submit-team-btn').click();
       }
    });

    test('Displays Graph on Success (200)', async ({ page }) => {
        await page.route('*/**/api/github/series*', async route => {
            await route.fulfill({ 
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 200,
                    commits: [10, 20, 5, 30],
                    diff: [100, 200, 50, 300],
                    hours: ["10:00", "11:00", "12:00", "13:00"]
                })
            });
        });

        const card = page.getByTestId(`team-card-${teamName}`);
        await card.getByTestId('toggle-graph-btn').click();
        
        // Check for ApexCharts container
        await expect(card.locator('.apexcharts-canvas')).toBeVisible();
    });

    test('Displays Error on 404 (Repo Not Found)', async ({ page }) => {
        await page.route('*/**/api/github/series*', async route => {
            await route.fulfill({ 
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ status: 404, message: "Repository not found" })
            });
        });

        const card = page.getByTestId(`team-card-${teamName}`);
        await card.getByTestId('toggle-graph-btn').click();
        
        await expect(card.getByText('Unable to load chart data: Repository not found')).toBeVisible();
    });

    test('Displays Error on 401 (Bad Token)', async ({ page }) => {
        await page.route('*/**/api/github/series*', async route => {
            await route.fulfill({ 
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ status: 401, message: "GitHub Token is missing or invalid" })
            });
        });

        const card = page.getByTestId(`team-card-${teamName}`);
        await card.getByTestId('toggle-graph-btn').click();
        
        await expect(card.getByText('Unable to load chart data: GitHub Token is missing or invalid')).toBeVisible();
    });
  });
});