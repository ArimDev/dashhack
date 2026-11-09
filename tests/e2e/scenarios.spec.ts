import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const PASSWORD = 'password123';
let eventName: string;

test.beforeEach(async ({ page, request }) => {
  eventName = `test-${randomUUID()}`;
  const created = await request.post('/api/auth/create', { data: { username: eventName, password: PASSWORD } });
  expect((await created.json()).status).toBe(200);
  await page.goto('/');
  const available = page.waitForResponse(r => r.url().includes('/api/auth/available?'));
  await page.getByTestId('username-input').fill(eventName);
  await available;
  await expect(page.getByTestId('login-button')).toHaveText('Open Dashboard');
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL(new RegExp(`/app/${eventName}/teams`));
});

async function addTeam(page, name = 'Team', github = '') {
  await page.getByTestId('add-team-fab').click();
  await page.getByTestId('team-name-input').fill(name);
  if (github) await page.getByTestId('team-github-input').fill(github);
  await page.getByTestId('team-desc-input').fill('Private event team');
  await page.getByTestId('submit-team-btn').click();
  const card = page.getByTestId(`team-card-${name}`);
  await expect(card).toBeVisible();
  return card;
}

async function saved(page, action) {
  const response = page.waitForResponse(r => r.url().includes('/api/team/edit') && r.request().method() === 'PUT');
  await action();
  expect((await (await response).json()).status).toBe(200);
}

test('GitHub App settings show setup state and block guests and other events from repository discovery', async ({ page, browser }) => {
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'GitHub App', exact: true })).toBeVisible();
  await expect(page.getByText('GitHub App connection is not available yet.', { exact: false })).toBeVisible();
  const setup = page.locator('details').filter({ has: page.getByText('Set up the GitHub App', { exact: true }) });
  await expect(setup.getByLabel('User authorization callback URL')).toHaveValue('http://127.0.0.1:5010/github/callback');
  const registration = new URL(await setup.getByRole('link', { name: /Register App for/ }).getAttribute('href'));
  expect(registration.pathname).toBe('/organizations/AT-T-Hackathon-Junior-2026/settings/apps/new');
  expect(registration.searchParams.get('contents')).toBe('read');
  await expect(setup.getByLabel('GitHub App server configuration').getByText('Missing', { exact: true })).toHaveCount(6);
  await page.getByRole('button', { name: 'Refresh setup status' }).click();
  await expect(setup).toBeVisible();
  const appStatus = await (await page.request.get(`/api/github/app/status?event=${eventName}`)).json();
  expect(appStatus.missingVariables).toHaveLength(6);
  expect(appStatus).not.toHaveProperty('githubAppPrivateKey');
  await page.setViewportSize({ width: 390, height: 844 });
  const sizes = await page.locator('#dashboard-content').evaluate(el => [el.scrollWidth, el.clientWidth]);
  expect(sizes[0]).toBeLessThanOrEqual(sizes[1] + 1);

  const other = `other-${randomUUID()}`;
  expect((await (await page.request.post('/api/auth/create', { data: { username: other, password: PASSWORD } })).json()).status).toBe(200);
  expect((await (await page.request.get(`/api/github/app/repositories?event=${other}`)).json()).status).toBe(403);
  const guest = await browser.newContext();
  try {
    expect((await (await guest.request.get(`/api/github/app/repositories?event=${eventName}`)).json()).status).toBe(401);
    expect((await (await guest.request.get(`/api/github/app/status?event=${eventName}`)).json()).status).toBe(401);
    expect((await (await guest.request.delete('/api/github/app/connection', { data: { event: eventName } })).json()).status).toBe(401);
  } finally { await guest.close(); }
});

test('GitHub repository picker searches, paginates and persists the chosen repository URL', async ({ page }) => {
  await page.route(`**/api/event/${eventName}`, async route => {
    const response = await route.fetch();
    const body = await response.json(); body.data.settings.githubApp = true;
    await route.fulfill({ json: body });
  });
  await page.route('**/api/github/rateLimit?*', route => route.fulfill({ json: { status: 200, rate: { remaining: 4999 } } }));
  await page.route('**/api/github/app/repositories?*', route => {
    const query = new URL(route.request().url()).searchParams;
    expect(query.get('event')).toBe(eventName);
    const second = query.get('page') === '2';
    return route.fulfill({ json: { status: 200, total: 101, hasMore: !second, repositories: [{ id: second ? 2 : 1,
      name: `att-hackathon-junior-2026/${second ? 'team-two' : 'team-one'}`,
      url: `https://github.com/att-hackathon-junior-2026/${second ? 'team-two' : 'team-one'}`, private: second }] } });
  });
  await page.reload();
  await page.getByTestId('add-team-fab').click();
  await page.getByTestId('team-name-input').fill('Selected repo');
  await page.getByRole('button', { name: 'Choose GitHub repository' }).click();
  await expect(page.getByRole('button', { name: 'att-hackathon-junior-2026/team-one', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load more repositories' }).click();
  await page.getByRole('textbox', { name: 'Search loaded repositories' }).fill('team-two');
  await page.getByRole('button', { name: 'att-hackathon-junior-2026/team-two (private)', exact: true }).click();
  await expect(page.getByTestId('team-github-input')).toHaveValue('https://github.com/att-hackathon-junior-2026/team-two');
  await page.getByTestId('submit-team-btn').click();
  await expect(page.getByTestId('team-card-Selected repo')).toBeVisible();
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  expect(event.teams[0].github).toBe('https://github.com/att-hackathon-junior-2026/team-two');
});

test('GitHub callback rejects forged state and strips authorization codes from its browser URL', async ({ page }) => {
  await page.goto('/github/callback?code=untrusted-code&state=forged');
  await expect(page.getByRole('alert')).toContainText('could not be verified');
  await expect(page).toHaveURL(/\/github\/callback$/);
  const rejected = await page.request.post('/api/github/app/connection', { data: { selectionId: 'forged', installationId: 123 } });
  expect((await rejected.json()).status).not.toBe(200);
});

test('startup matrix offers ten default questions and persists partial formatted answers with a mentor', async ({ page }) => {
  const mentorResponse = await page.request.post('/api/mentor/add', { data: { username: eventName, name: 'Matrix Mentor' } });
  expect((await mentorResponse.json()).status).toBe(200);
  const card = await addTeam(page, 'Startup team');
  await card.getByText('Startupová matice', { exact: true }).click();
  const matrix = card.getByTestId('startup-matrix');
  await expect(matrix.getByText('Vyplněno 0/10 odpovědí.', { exact: true })).toBeVisible();
  await expect(matrix.getByTestId('matrix-field-problem')).toContainText('Jaký problém váš produkt řeší? Budou za to chtít zákazníci platit?');
  await expect(matrix.getByRole('heading', { name: 'KLIENTI', exact: true })).toBeVisible();
  await expect(matrix.getByRole('heading', { name: 'KONKURENCE', exact: true })).toBeVisible();
  await matrix.getByRole('button', { name: 'Upravit matici' }).click();
  await expect(matrix.getByRole('textbox')).toHaveCount(10);
  await expect(matrix.getByRole('textbox', { name: 'PROBLÉM', exact: true })).toHaveText('Jaký problém váš produkt řeší? Budou za to chtít zákazníci platit?');
  await matrix.getByRole('combobox', { name: 'Mentor startupové matice' }).selectOption({ label: 'Matrix Mentor' });
  const problem = matrix.getByRole('textbox', { name: 'PROBLÉM', exact: true });
  await problem.fill('Students cannot easily find accessible study rooms.');
  await problem.press('Control+a');
  await matrix.getByRole('button', { name: 'PROBLÉM: Bold', exact: true }).click();
  await matrix.getByRole('textbox', { name: 'ŘEŠENÍ', exact: true }).fill('A shared map with verified accessibility information.');
  await matrix.getByRole('button', { name: 'Uložit matici' }).click();
  await expect(matrix.getByRole('status')).toHaveText('Startupová matice uložena.');
  await expect(matrix.getByTestId('matrix-field-problem').locator('.font-bold').last()).toHaveText('Students cannot easily find accessible study rooms.');
  await card.getByTestId('toggle-notes-btn').click();
  await saved(page, () => card.getByTestId('add-note-btn').click());
  await page.reload();
  await card.getByText('Startupová matice', { exact: true }).click();
  await expect(matrix).toContainText('Vyplněno 2/10 odpovědí.');
  await expect(matrix).toContainText('Zpracoval/a: Matrix Mentor.');
  await expect(matrix.getByTestId('matrix-field-solution')).toContainText('A shared map with verified accessibility information.');
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  expect(Object.keys(event.teams[0].startupMatrix)).toEqual(['problem', 'solution']);
});

test('startup matrix is public read-only and rejects unauthenticated saves', async ({ page, browser }) => {
  const card = await addTeam(page, 'Public startup');
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  const team = event.teams[0];
  const answer = [{ type: 'paragraph', runs: [{ text: 'Public market research', italic: true }] }];
  const updated = await page.request.patch('/api/team/matrix', { data: { username: eventName, teamId: team._id, revision: team.revision, answers: { market: answer } } });
  expect((await updated.json()).status).toBe(200);
  const guest = await browser.newContext();
  try {
    const view = await guest.newPage();
    await view.goto(`/app/${eventName}/teams`);
    await view.getByText('Startupová matice', { exact: true }).click();
    const matrix = view.getByTestId('startup-matrix');
    await expect(matrix.getByTestId('matrix-field-market').locator('.italic')).toHaveText('Public market research');
    await expect(matrix.getByRole('button', { name: 'Upravit matici' })).toHaveCount(0);
    await expect(matrix.getByRole('textbox')).toHaveCount(0);
    const rejected = await guest.request.patch('/api/team/matrix', { data: { username: eventName, teamId: team._id, revision: team.revision + 1, answers: { market: [] } } });
    expect((await rejected.json()).status).toBe(401);
  } finally { await guest.close(); }
});

test('startup matrix preserves drafts on collapse and stale saves, then reloads explicitly', async ({ page }) => {
  const card = await addTeam(page, 'Concurrent startup');
  const summary = card.getByText('Startupová matice', { exact: true });
  await summary.click();
  const matrix = card.getByTestId('startup-matrix');
  await matrix.getByRole('button', { name: 'Upravit matici' }).click();
  const problem = matrix.getByRole('textbox', { name: 'PROBLÉM', exact: true });
  await problem.fill('My unsaved mentor draft');
  await summary.click(); await summary.click();
  await expect(problem).toHaveText('My unsaved mentor draft');
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  const team = event.teams[0];
  const updated = await page.request.patch('/api/team/matrix', { data: { username: eventName, teamId: team._id, revision: team.revision, answers: {
    problem: [{ type: 'paragraph', runs: [{ text: 'Another mentor saved this' }] }],
  } } });
  expect((await updated.json()).status).toBe(200);
  await matrix.getByRole('button', { name: 'Uložit matici' }).click();
  await expect(matrix.getByRole('alert')).toContainText('Tým mezitím někdo změnil');
  await expect(problem).toHaveText('My unsaved mentor draft');
  await matrix.getByRole('button', { name: 'Zahodit rozepsané změny a načíst aktuální data' }).click();
  await expect(problem).toHaveText('Another mentor saved this');
  await matrix.getByRole('textbox', { name: 'ŘEŠENÍ', exact: true }).fill('A second mentor adds a solution');
  await matrix.getByRole('button', { name: 'Uložit matici' }).click();
  await expect(matrix.getByRole('status')).toHaveText('Startupová matice uložena.');
  await expect(matrix.getByTestId('matrix-field-problem')).toContainText('Another mentor saved this');
  await expect(matrix.getByTestId('matrix-field-solution')).toContainText('A second mentor adds a solution');
});

test('team originality and formatted project abstract persist through note saves and team edits', async ({ page, browser }) => {
  await page.getByTestId('add-team-fab').click();
  await page.getByTestId('team-name-input').fill('Project team');
  await page.getByRole('textbox', { name: 'Originalita', exact: true }).fill('Combines mapping and student research');
  const editor = page.getByRole('textbox', { name: 'Project Abstract', exact: true });
  await editor.fill('A collaborative prototype');
  await editor.press('Control+a');
  await page.getByRole('button', { name: 'Project Abstract: Bold', exact: true }).click();
  await page.getByTestId('submit-team-btn').click();
  const card = page.getByTestId('team-card-Project team');
  await expect(card.getByTestId('team-originality')).toHaveText('Combines mapping and student research');
  await expect(card.getByTestId('team-abstract').locator('.font-bold')).toHaveText('A collaborative prototype');
  await card.getByTestId('toggle-notes-btn').click();
  await saved(page, () => card.getByTestId('add-note-btn').click());
  await card.getByTestId('note-content').fill('Independent mentor note');
  await saved(page, () => card.getByTestId('note-content').blur());
  await page.reload();
  await expect(card.getByTestId('team-abstract').locator('.font-bold')).toHaveText('A collaborative prototype');
  await card.locator('button').nth(2).click();
  await expect(page.getByRole('textbox', { name: 'Originalita', exact: true })).toHaveValue('Combines mapping and student research');
  await expect(editor).toHaveText('A collaborative prototype');
  await editor.fill('An improved prototype');
  await editor.press('Control+a');
  await page.getByRole('button', { name: 'Project Abstract: Italic', exact: true }).click();
  await page.getByRole('button', { name: 'Project Abstract: Bullets', exact: true }).click();
  await page.getByTestId('submit-team-btn').click();
  await expect(card.getByTestId('team-abstract').locator('.italic')).toHaveText('An improved prototype');
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  expect(event.teams[0].projectAbstract[0].type).toBe('bullet');
  expect(event.teams[0].stickyNotes[0].content).toBe('Independent mentor note');
  const guest = await browser.newContext();
  try {
    const view = await guest.newPage();
    await view.goto(`/app/${eventName}/teams`);
    await expect(view.getByTestId('team-abstract').locator('.italic')).toHaveText('An improved prototype');
    await expect(view.getByTestId('team-originality')).toHaveText('Combines mapping and student research');
  } finally { await guest.close(); }
});

test('project abstract pastes plain text safely and can be cleared when editing', async ({ page }) => {
  const card = await addTeam(page, 'Safe abstract');
  await card.locator('button').nth(2).click();
  const editor = page.getByRole('textbox', { name: 'Project Abstract', exact: true });
  await editor.focus();
  await editor.evaluate(element => {
    const clipboard = new DataTransfer();
    clipboard.setData('text/html', '<img src=x onerror="window.abstractInjected=true"><b>Example</b>');
    clipboard.setData('text/plain', '<img src=x onerror="window.abstractInjected=true">Example');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
  });
  await page.getByRole('textbox', { name: 'Originalita', exact: true }).fill('<script>literal text</script>');
  await page.getByTestId('submit-team-btn').click();
  await expect(card.getByTestId('team-abstract')).toContainText('<img src=x');
  await expect(card.getByTestId('team-abstract').locator('img, script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).abstractInjected)).toBeUndefined();
  await card.locator('button').nth(2).click();
  await editor.fill('');
  await page.getByRole('textbox', { name: 'Originalita', exact: true }).fill('');
  await page.getByTestId('submit-team-btn').click();
  await page.reload();
  await expect(card.getByTestId('team-originality')).toHaveText('Not provided.');
  await expect(card.getByTestId('team-abstract')).toHaveCount(0);
});

test('create, edit and delete a team', async ({ page }) => {
  let card = await addTeam(page);
  await card.locator('button').nth(2).click();
  await page.getByTestId('team-name-input').fill('Renamed');
  await page.getByTestId('submit-team-btn').click();
  card = page.getByTestId('team-card-Renamed');
  await expect(card).toBeVisible();
  await card.locator('button').nth(3).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(card).not.toBeVisible();
});

test('sticky notes survive reload, update priority, and delete', async ({ page }) => {
  const card = await addTeam(page, 'Notes');
  await card.getByTestId('toggle-notes-btn').click();
  await saved(page, () => card.getByTestId('add-note-btn').click());
  await saved(page, () => card.getByRole('checkbox', { name: 'Track in Kanban' }).last().check());
  const content = card.getByTestId('note-content');
  await content.fill('Persistent organizer note');
  await saved(page, () => content.blur());
  await saved(page, () => card.getByRole('combobox', { name: 'Note priority' }).selectOption('high'));
  await page.reload();
  await page.getByTestId('toggle-notes-btn').click();
  await expect(page.getByTestId('note-content')).toHaveValue('Persistent organizer note');
  await expect(page.getByRole('combobox', { name: 'Note priority' })).toHaveValue('high');
  await saved(page, () => page.getByTestId('delete-note-btn').click());
  await expect(page.getByTestId('note-content')).toHaveCount(0);
});

test('activity chart loads on demand', async ({ page }) => {
  await page.route('**/api/github/series?**', route => route.fulfill({ json: {
    status: 200, commits: [1, 2, 3], diff: [10, 20, 30], hours: ['10:00', '11:00', '12:00'],
  } }));
  const card = await addTeam(page, 'Chart', 'https://github.com/mock/repo');
  await card.getByTestId('toggle-graph-btn').click();
  await expect(card.locator('.apexcharts-canvas')).toBeVisible();
});

for (const [status, message] of [[404, 'Repository not found'], [401, 'GitHub Token is missing or invalid']] as const) {
  test(`activity chart displays API body status ${status}`, async ({ page }) => {
    await page.route('**/api/github/series?**', route => route.fulfill({ json: { status, message } }));
    const card = await addTeam(page, 'Chart', 'https://github.com/mock/repo');
    await card.getByTestId('toggle-graph-btn').click();
    await expect(card.getByText(message, { exact: true })).toBeVisible();
  });
}

test('settings target the current event, persist and rename', async ({ page }) => {
  await page.goto(`/app/${eventName}/settings`);
  const logo = page.getByPlaceholder('Valid Image URL');
  await logo.fill('https://example.com/event.png');
  const updated = page.waitForResponse(r => r.url().includes('/api/auth/update'));
  await logo.blur(); expect((await (await updated).json()).status).toBe(200);
  await page.reload();
  await expect(page.getByPlaceholder('Valid Image URL')).toHaveValue('https://example.com/event.png');
  const name = page.getByPlaceholder('Event Name');
  await name.fill(eventName + '-renamed'); await name.blur();
  await expect(page).toHaveURL(new RegExp(`/app/${eventName}-renamed/settings`));
});

test('public viewing stays readable and anonymous writes are rejected', async ({ page, browser }) => {
  await addTeam(page, 'Public');
  const guest = await browser.newContext();
  try {
    const view = await guest.newPage();
    await view.goto(`/app/${eventName}/teams`);
    await expect(view.getByTestId('team-card-Public')).toBeVisible();
    const response = await guest.request.post('/api/team/add', { data: {
      username: eventName, teamName: 'Forbidden', teamColor: '#3081E0',
    } });
    expect((await response.json()).status).toBe(401);
  } finally { await guest.close(); }
});

test('new event registration works from the landing page', async ({ page }) => {
  await page.goto('/');
  const name = `new-${randomUUID()}`;
  const checked = page.waitForResponse(r => r.url().includes('/api/auth/available?'));
  await page.getByTestId('username-input').fill(name); await checked;
  await expect(page.getByTestId('login-button')).toHaveText('Create New Event');
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL(new RegExp(`/app/${name}/teams`));
});

async function addNote(page, card, content) {
  await card.getByTestId('toggle-notes-btn').click();
  await saved(page, () => card.getByTestId('add-note-btn').click());
  await saved(page, () => card.getByRole('checkbox', { name: 'Track in Kanban' }).last().check());
  const input = card.getByTestId('note-content').last();
  await input.fill(content);
  await saved(page, () => input.blur());
}

async function boardSaved(page, action, method = 'PATCH') {
  const response = page.waitForResponse(r => r.url().includes('/api/note/') && r.request().method() === method);
  await action();
  expect((await (await response).json()).status).toBe(200);
  await expect(page.getByRole('status')).toHaveText(method === 'DELETE' ? 'Note deleted.' : 'Note saved.');
}

async function openBoard(page) {
  await page.getByRole('link', { name: 'Kanban', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kanban notes', exact: true })).toBeVisible();
}

test('Kanban gathers team notes, filters, and persists moves in both views', async ({ page }) => {
  await addNote(page, await addTeam(page, 'Alpha'), 'Alpha task');
  await addNote(page, await addTeam(page, 'Beta'), 'Beta task');
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  const alphaId = event.teams.find(t => t.name === 'Alpha').stickyNotes[0].id;
  const betaId = event.teams.find(t => t.name === 'Beta').stickyNotes[0].id;
  await openBoard(page);
  const alpha = page.getByTestId(`kanban-note-${alphaId}`);
  const beta = page.getByTestId(`kanban-note-${betaId}`);
  await expect(page.getByTestId('kanban-column-To Do').getByTestId('note-content')).toHaveCount(2);
  await expect(alpha.getByRole('link', { name: 'Alpha', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter by team' }).selectOption({ label: 'Alpha' });
  await expect(alpha).toBeVisible(); await expect(beta).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filter by team' }).selectOption('');
  await boardSaved(page, () => alpha.getByTestId('note-status').selectOption('In Progress'));
  await expect(page.getByTestId('kanban-column-In Progress').getByTestId(`kanban-note-${alphaId}`)).toBeVisible();
  await boardSaved(page, () => beta.getByTestId('drag-note').dragTo(page.getByTestId('kanban-column-Done'), { targetPosition: { x: 20, y: 20 } }));
  await expect(page.getByTestId('kanban-column-Done').getByTestId(`kanban-note-${betaId}`)).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('kanban-column-Done').getByTestId(`kanban-note-${betaId}`)).toBeVisible();
  await page.getByRole('link', { name: 'Teams', exact: true }).click();
  const team = page.getByTestId('team-card-Alpha');
  await team.getByTestId('toggle-notes-btn').click();
  await expect(team.getByTestId('note-status')).toHaveValue('In Progress');
  await saved(page, () => team.getByTestId('note-status').selectOption('Done'));
  await openBoard(page);
  await expect(page.getByTestId('kanban-column-Done').getByTestId('note-content')).toHaveCount(2);
});

test('Kanban edits and deletes notes without losing their team context', async ({ page }) => {
  await addNote(page, await addTeam(page, 'Editable'), 'Original task');
  await openBoard(page);
  const input = page.getByTestId('note-content');
  await input.fill('Edited from the board');
  await boardSaved(page, () => input.blur());
  await boardSaved(page, () => page.getByRole('combobox', { name: 'Note priority' }).selectOption('high'));
  await page.reload();
  await expect(input).toHaveValue('Edited from the board');
  await expect(page.getByRole('combobox', { name: 'Note priority' })).toHaveValue('high');
  await boardSaved(page, () => page.getByTestId('delete-note-btn').click(), 'DELETE');
  await expect(page.getByText('No Kanban notes yet.', { exact: true })).toBeVisible();
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  expect(event.teams[0].stickyNotes).toHaveLength(0);
  expect(event.teams[0].description).toBe('Private event team');
});

test('Kanban remains view-only for guests and rejects their note writes', async ({ page, browser }) => {
  await addNote(page, await addTeam(page, 'Visible'), 'Public note');
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  const team = event.teams[0];
  const guest = await browser.newContext();
  try {
    const view = await guest.newPage();
    await view.goto(`/app/${eventName}/kanban`);
    await expect(view.getByTestId('note-content')).toHaveValue('Public note');
    await expect(view.getByTestId('note-content')).not.toBeEditable();
    await expect(view.getByTestId('note-status')).toBeDisabled();
    await expect(view.getByTestId('drag-note')).toHaveCount(0);
    await expect(view.getByTestId('delete-note-btn')).toHaveCount(0);
    const response = await guest.request.patch('/api/note/edit', { data: {
      username: eventName, teamId: team._id, noteId: team.stickyNotes[0].id,
      revision: team.revision, patch: { status: 'Done' },
    } });
    expect((await response.json()).status).toBe(401);
  } finally { await guest.close(); }
});

test('Kanban reloads on a stale move and preserves another organizer edit', async ({ page }) => {
  await addNote(page, await addTeam(page, 'Concurrent'), 'Original task');
  await openBoard(page);
  const event = (await (await page.request.get(`/api/event/${eventName}`)).json()).data;
  const team = event.teams[0], note = team.stickyNotes[0];
  const update = await page.request.patch('/api/note/edit', { data: {
    username: eventName, teamId: team._id, noteId: note.id, revision: team.revision,
    patch: { content: 'Another organizer changed this' },
  } });
  expect((await update.json()).status).toBe(200);
  await page.getByTestId('note-status').selectOption('Done');
  await expect(page.getByRole('alert')).toContainText('Team changed');
  await expect(page.getByTestId('note-content')).toHaveValue('Another organizer changed this');
  await expect(page.getByTestId('note-status')).toHaveValue('To Do');
});

test('Kanban supports spaced event names and enables editing after modal login', async ({ page, browser }) => {
  const name = `Private Event ${randomUUID()}`;
  const created = await page.request.post('/api/auth/create', { data: { username: name, password: PASSWORD } });
  expect((await created.json()).status).toBe(200);
  const guest = await browser.newContext();
  try {
    const view = await guest.newPage();
    await view.goto(`/app/${encodeURIComponent(name)}/kanban`);
    await expect(view.getByRole('heading', { name: 'Kanban notes' })).toBeVisible();
    await expect(view.getByText('Read-only board.', { exact: false })).toBeVisible();
    await view.getByRole('button', { name: 'Cannot make changes' }).click();
    await view.getByPlaceholder('Password', { exact: true }).fill(PASSWORD);
    await view.getByRole('button', { name: 'Log In', exact: true }).click();
    await expect(view.getByRole('button', { name: 'Can make changes', exact: true })).toBeVisible();
    await expect(view.getByText("Drag a card or its Move handle to another column.", { exact: false })).toBeVisible();
  } finally { await guest.close(); }
});

test('mentors register and can be selected on help requests and mentor notes in both views', async ({ page }) => {
  await page.getByRole('link', { name: 'Mentors', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Event mentors' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Alice Mentor');
  await page.getByRole('button', { name: 'Add myself' }).click();
  await expect(page.getByRole('listitem')).toHaveText('Alice Mentor');
  await page.getByRole('textbox', { name: 'Your name' }).fill('alice mentor');
  await page.getByRole('button', { name: 'Add myself' }).click();
  await expect(page.getByRole('alert')).toContainText('already exists');
  await page.getByRole('link', { name: 'Teams', exact: true }).click();
  const card = await addTeam(page, 'Help desk');
  await card.getByTestId('toggle-notes-btn').click();
  await saved(page, () => card.getByTestId('add-help-btn').click());
  await expect(card.getByRole('combobox', { name: 'Note type' })).toHaveValue('help_request');
  await card.getByTestId('note-content').fill('Need help debugging our API');
  await saved(page, () => card.getByTestId('note-content').blur());
  await saved(page, () => card.getByRole('combobox', { name: 'Note creator' }).selectOption({ label: 'Alice Mentor' }));
  await openBoard(page);
  await page.getByRole('combobox', { name: 'Filter by note type' }).selectOption('help_request');
  await expect(page.getByTestId('note-content')).toHaveValue('Need help debugging our API');
  await expect(page.getByRole('combobox', { name: 'Note creator' })).toHaveValue(/.+/);
  await boardSaved(page, () => page.getByTestId('note-status').selectOption('In Progress'));
  await page.reload();
  await expect(page.getByTestId('kanban-column-In Progress').getByTestId('note-content')).toHaveValue('Need help debugging our API');
  await expect(page.getByRole('combobox', { name: 'Note creator' }).locator('option:checked')).toHaveText('Alice Mentor');
  await boardSaved(page, () => page.getByRole('combobox', { name: 'Note type', exact: true }).selectOption('mentor_note'));
  await page.getByRole('combobox', { name: 'Filter by note type' }).selectOption('help_request');
  await expect(page.getByTestId('note-content')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filter by note type' }).selectOption('mentor_note');
  await expect(page.getByTestId('note-content')).toHaveValue('Need help debugging our API');
  await page.getByRole('link', { name: 'Teams', exact: true }).click();
  await page.getByTestId('toggle-notes-btn').click();
  await expect(page.getByRole('combobox', { name: 'Note type' })).toHaveValue('mentor_note');
  await expect(page.getByRole('combobox', { name: 'Note creator' }).locator('option:checked')).toHaveText('Alice Mentor');
});

test('plain team notes can opt into and out of Kanban while preserving content and priority', async ({ page }) => {
  const card = await addTeam(page, 'Observations');
  await card.getByTestId('toggle-notes-btn').click();
  await saved(page, () => card.getByTestId('add-note-btn').click());
  await expect(card.getByRole('checkbox', { name: 'Track in Kanban' })).not.toBeChecked();
  await expect(card.getByRole('combobox', { name: 'Note priority' })).toHaveCount(0);
  await expect(card.getByTestId('note-status')).toHaveCount(0);
  await card.getByTestId('note-content').fill('Team prefers a mentor visit after lunch');
  await saved(page, () => card.getByTestId('note-content').blur());
  await openBoard(page);
  await expect(page.getByText('No Kanban notes yet.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('note-content')).toHaveCount(0);
  await page.getByRole('link', { name: 'Teams', exact: true }).click();
  await page.getByTestId('toggle-notes-btn').click();
  await expect(page.getByTestId('note-content')).toHaveValue('Team prefers a mentor visit after lunch');
  await saved(page, () => page.getByRole('checkbox', { name: 'Track in Kanban' }).check());
  await saved(page, () => page.getByRole('combobox', { name: 'Note priority' }).selectOption('high'));
  await openBoard(page);
  await expect(page.getByTestId('note-content')).toHaveValue('Team prefers a mentor visit after lunch');
  await boardSaved(page, () => page.getByTestId('note-status').selectOption('In Progress'));
  await boardSaved(page, () => page.getByRole('checkbox', { name: 'Track in Kanban' }).click());
  await expect(page.getByTestId('note-content')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('No Kanban notes yet.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Teams', exact: true }).click();
  await page.getByTestId('toggle-notes-btn').click();
  await expect(page.getByTestId('note-content')).toHaveValue('Team prefers a mentor visit after lunch');
  await expect(page.getByRole('combobox', { name: 'Note priority' })).toHaveCount(0);
  await saved(page, () => page.getByRole('checkbox', { name: 'Track in Kanban' }).check());
  await expect(page.getByRole('combobox', { name: 'Note priority' })).toHaveValue('high');
  await expect(page.getByTestId('note-status')).toHaveValue('In Progress');
});

test('guests can view mentors but cannot register or change note attribution', async ({ page, browser }) => {
  const added = await page.request.post('/api/mentor/add', { data: { username: eventName, name: 'Visible Mentor' } });
  expect((await added.json()).status).toBe(200);
  const guest = await browser.newContext();
  try {
    const view = await guest.newPage();
    await view.goto(`/app/${eventName}/mentors`);
    await expect(view.getByRole('listitem')).toHaveText('Visible Mentor');
    await expect(view.getByRole('button', { name: 'Add myself' })).toHaveCount(0);
    const rejected = await guest.request.post('/api/mentor/add', { data: { username: eventName, name: 'Guest' } });
    expect((await rejected.json()).status).toBe(401);
  } finally { await guest.close(); }
});


test('Kanban drags the card body after an edit without losing text during its pending save',async ({page})=>{
  await addNote(page,await addTeam(page,'Dragging'),'Before dragging');
  const event=(await(await page.request.get(`/api/event/${eventName}`)).json()).data;
  const noteId=event.teams[0].stickyNotes[0].id;
  await openBoard(page);
  const card=page.getByTestId(`kanban-note-${noteId}`),input=card.getByTestId('note-content');
  let release,started;const gate=new Promise(resolve=>{release=resolve}),began=new Promise(resolve=>{started=resolve});
  const patches=[];
  await page.route('**/api/note/edit',async route=>{
    const body=route.request().postDataJSON();patches.push(body.patch);
    if(body.patch.content){const response=await route.fetch();started();await gate;return route.fulfill({response});}
    await route.continue();
  });
  await input.fill('Keep this edit while moving');
  const moved=card.dragTo(page.getByTestId('kanban-column-In Progress'),{sourcePosition:{x:8,y:90},targetPosition:{x:20,y:20}});
  await began;await moved;
  await expect(page.getByRole('status')).toHaveText('Saving note…');
  await expect(page.getByTestId('kanban-column-To Do').getByTestId(`kanban-note-${noteId}`)).toBeVisible();
  release();
  await expect(page.getByTestId('kanban-column-In Progress').getByTestId(`kanban-note-${noteId}`)).toBeVisible();
  await expect(card.getByTestId('note-content')).toHaveValue('Keep this edit while moving');
  expect(patches).toEqual([{content:'Keep this edit while moving'},{status:'In Progress'}]);
  await page.reload();
  await expect(page.getByTestId('kanban-column-In Progress').getByTestId(`kanban-note-${noteId}`)).toBeVisible();
  await expect(card.getByTestId('note-content')).toHaveValue('Keep this edit while moving');
});

test('Teams grid, Czech search and jump menu preserve open cards and work on phones', async ({ page }) => {
  const first = await addTeam(page, 'Žlutý tým', 'https://github.com/demo/phoenix');
  const second = await addTeam(page, 'Modrý tým');
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const a = await first.boundingBox(), b = await second.boundingBox();
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x).toBeGreaterThanOrEqual(a.x + a.width);
  }
  await first.getByTestId('toggle-notes-btn').click();
  await page.getByLabel('Search teams', { exact: true }).fill('modry');
  await expect(first).toBeHidden();
  await expect(second).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(first.getByTestId('toggle-notes-btn')).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Search teams', { exact: true }).fill('phoenix');
  await expect(first).toBeVisible();
  await expect(second).toBeHidden();
  await page.getByLabel('Search teams', { exact: true }).fill('no such project');
  await expect(page.getByText('No teams match your search.')).toBeVisible();
  const id = await second.locator('..').getAttribute('id');
  await page.getByLabel('Jump to team', { exact: true }).selectOption({ label: 'Modrý tým' });
  await expect(page.getByLabel('Search teams', { exact: true })).toHaveValue('');
  await expect(page.locator(`[id="${id}"]`)).toBeFocused();
  await expect(second).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  const a = await first.boundingBox(), b = await second.boundingBox();
  expect(b.y).toBeGreaterThan(a.y);
  const sizes = await page.locator('#dashboard-content').evaluate(el => [el.scrollWidth, el.clientWidth]);
  expect(sizes[0]).toBeLessThanOrEqual(sizes[1] + 1);
  await page.getByLabel('Jump to team', { exact: true }).selectOption({ label: 'Žlutý tým' });
  await expect(first.getByRole('heading', { name: 'Žlutý tým', exact: true })).toBeInViewport();
});
