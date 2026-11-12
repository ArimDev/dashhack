import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

async function setup(page, teamCount = 1) {
  const name = `Compact-${randomUUID()}`, password = 'password123';
  for (const action of ['create', 'login']) expect((await (await page.request.post(`/api/auth/${action}`, { data: { username: name, password } })).json()).status).toBe(200);
  for (let i = 0; i < teamCount; i++) expect((await (await page.request.post('/api/team/add', { data: { username: name, teamName: `${11 + i} - Team ${i + 1}`, teamColor: '#ffb000' } })).json()).status).toBe(200);
  let event = (await (await page.request.get(`/api/event/${name}`)).json()).data;
  const team = event.teams[0], notes = Array.from({ length: 4 }, (_, i) => ({ id: randomUUID(), content: `Issue ${i + 1}: API help needed`, type: 'help_request', inKanban: true, status: 'To Do', priority: i === 0 ? 'critical' : 'medium' }));
  expect((await (await page.request.put('/api/team/edit', { data: { username: name, teamId: team._id, revision: team.revision, teamName: team.name, teamColor: team.color, stickyNotes: notes } })).json()).status).toBe(200);
  return { name, team, notes };
}

test('Teams saves explicitly once and shows Saved only after the server acknowledges', async ({ page }) => {
  const { name, team, notes } = await setup(page);
  await page.goto(`/app/${name}/teams`);
  const card = page.getByTestId(`team-card-${team.name}`);
  await card.getByTestId('toggle-notes-btn').click();
  const note = page.getByRole('dialog').locator('.sticky-note').first(), input = note.getByTestId('note-content'), save = note.getByTestId('save-note-btn');
  let release; const gate = new Promise<void>(resolve => { release = resolve; }); let writes = 0;
  await page.route('**/api/team/edit', async route => { writes++; await gate; await route.continue(); });
  await input.fill('Explicitly saved issue'); await save.click();
  await expect(save).toHaveText('Saving...'); await expect(save).toBeDisabled();
  const before = (await (await page.request.get(`/api/event/${name}`)).json()).data;
  expect(before.teams[0].stickyNotes.find(n => n.id === notes[0].id).content).not.toBe('Explicitly saved issue');
  release(); await expect(save).toHaveText('Saved'); expect(writes).toBe(1);
  await page.reload(); await card.getByTestId('toggle-notes-btn').click();
  await expect(page.getByRole('dialog').getByTestId('note-content').first()).toHaveValue('Explicitly saved issue');
});

test('Teams retries a failed note save without losing another note', async ({ page }) => {
  const { name, team, notes } = await setup(page);
  await page.goto(`/app/${name}/teams`);
  const card = page.getByTestId(`team-card-${team.name}`); await card.getByTestId('toggle-notes-btn').click();
  const note = page.getByRole('dialog').locator('.sticky-note').first(), input = note.getByTestId('note-content'), save = note.getByTestId('save-note-btn');
  await expect(input).toHaveValue(notes[0].content);
  const fresh = (await (await page.request.get(`/api/event/${name}`)).json()).data.teams[0];
  await page.request.patch('/api/note/edit', { data: { username: name, teamId: team._id, noteId: notes[1].id, revision: fresh.revision, patch: { content: 'Other note preserved' } } });
  await input.fill('Retain this mentor note'); await save.click();
  await expect(note.getByText('Could not save note.', { exact: false })).toBeVisible();
  await expect(input).toHaveValue('Retain this mentor note'); await save.click(); await expect(save).toHaveText('Saved');
  const persisted = (await (await page.request.get(`/api/event/${name}`)).json()).data.teams[0];
  expect(persisted.stickyNotes.find(n => n.id === notes[0].id).content).toBe('Retain this mentor note');
  expect(persisted.stickyNotes.find(n => n.id === notes[1].id).content).toBe('Other note preserved');
});

test('Kanban retains failed text drafts, pauses refresh and supports an explicit retry', async ({ page }) => {
  const { name, team, notes } = await setup(page);
  await page.clock.install(); await page.goto(`/app/${name}/kanban`);
  const card = page.getByTestId(`kanban-note-${notes[0].id}`), input = card.getByTestId('note-content'), save = card.getByTestId('save-note-btn');
  await expect(input).toHaveValue(notes[0].content);
  const fresh = (await (await page.request.get(`/api/event/${name}`)).json()).data.teams[0];
  expect((await (await page.request.patch('/api/note/edit', { data: { username: name, teamId: team._id, noteId: notes[0].id, revision: fresh.revision, patch: { content: 'Another organizer edit' } } })).json()).status).toBe(200);
  await input.fill('Keep my unsaved text'); await save.click();
  await expect(card.getByText('Could not save note.', { exact: false })).toBeVisible();
  await expect(input).toHaveValue('Keep my unsaved text'); await expect(save).toBeEnabled();
  await page.getByRole('heading', { name: 'Kanban notes', exact: true }).click();
  let reads = 0; page.on('request', request => { if (request.url().endsWith(`/api/event/${name}`)) reads++; });
  await page.clock.runFor(16000); expect(reads).toBe(0); await expect(input).toHaveValue('Keep my unsaved text');
  await save.click(); await expect(save).toHaveText('Saved');
  const persisted = (await (await page.request.get(`/api/event/${name}`)).json()).data.teams[0];
  expect(persisted.stickyNotes.find(n => n.id === notes[0].id).content).toBe('Keep my unsaved text');
});

test('compact desktop grids fit more cards while phones retain readable controls', async ({ page }) => {
  const { name, team } = await setup(page, 8);
  for (let i = 0; i < 8; i++) await page.request.post('/api/mentor/add', { data: { username: name, name: `Mentor ${i + 1}` } });
  await page.setViewportSize({ width: 1920, height: 1080 }); await page.goto(`/app/${name}/teams`);
  await expect.poll(() => page.getByTestId('teams-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3);
  const card = page.getByTestId(`team-card-${team.name}`); await card.getByTestId('toggle-notes-btn').click();
  await expect(card.getByText('Not provided.', { exact: true })).toHaveCount(0);
  // The assignee row adds a required 44px control; retain a compact desktop bound.
  const note = page.getByRole('dialog').locator('.sticky-note').first(); expect((await note.boundingBox())!.height).toBeLessThan(320);
  expect((await note.getByTestId('note-content').boundingBox())!.y).toBeLessThan((await note.getByLabel('Note creator').boundingBox())!.y);
  await page.goto(`/app/${name}/kanban`);
  await expect.poll(() => page.locator('.kanban-notes-grid').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
  await page.goto(`/app/${name}/mentors`); await expect(page.getByTestId('mentor-grid').locator('li')).toHaveCount(8);
  await expect.poll(() => page.getByTestId('mentor-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(4);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`/app/${name}/teams`); await card.getByTestId('toggle-notes-btn').click();
  const save = page.getByRole('dialog').getByTestId('save-note-btn').first(); expect((await save.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
