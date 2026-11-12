import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteStore, publicEvent } from '../../src/server/storage/sqlite.js';
import { importMongoEvents } from '../../src/server/storage/import.js';

const paths = [], stores = [];
afterEach(() => {
    for (const store of stores.splice(0)) { try { store.close(); } catch {} }
    for (const path of paths.splice(0)) rmSync(path, { recursive: true, force: true });
});
function makeStore(options) {
    const dir = mkdtempSync(join(tmpdir(), 'dashhack-test-')); paths.push(dir);
    const filename = join(dir, 'data', 'app.sqlite');
    const store = new SqliteStore(filename, options); stores.push(store);
    return { store, filename };
}
async function account(store, name = 'event') {
    const id = await store.createEvent(name, 'password123');
    return { id, session: store.createSession(id) };
}
const team = { teamName: 'Team', teamColor: '#3081E0', teamGithub: 'https://github.com/test/repo', teamDescription: 'Description' };
const note = { id: 'note-1', content: 'Persist me', color: '#ffeb3b', priority: 'high', status: 'To Do' };

describe('SQLite persistence', () => {
    test('schema 7 upgrades preserve all existing tables while adding empty invitation security tables', async () => {
        const {store,filename}=makeStore();const {session}=await account(store);store.addTeam(session,'event',team);
        const names=['events','teams','notes','mentors','github_connections','wall_settings','wall_posts','wall_media'];
        const before=Object.fromEntries(names.map(n=>[n,store.db.query('SELECT * FROM '+n).all()]));
        store.db.exec('DROP TABLE IF EXISTS discord_message_cleanup; DROP TABLE IF EXISTS discord_notifications; DROP TABLE discord_matrix_flows; DROP TABLE discord_actions; DROP TABLE discord_settings; DROP TABLE team_invite_audit; DROP TABLE team_invite_flows; DROP TABLE team_invite_links; PRAGMA user_version=7;');store.close();
        const upgraded=new SqliteStore(filename);stores.push(upgraded);
        expect(upgraded.db.query('PRAGMA user_version').get().user_version).toBe(15);
        for(const n of names)expect(upgraded.db.query('SELECT * FROM '+n).all()).toEqual(before[n]);
        expect(upgraded.db.query('SELECT COUNT(*) n FROM team_invite_links').get().n).toBe(0);
        expect(upgraded.db.query('PRAGMA integrity_check').get().integrity_check).toBe('ok');
    });

    test('schema 5 upgrades preserve demo data while GitHub connection details stay out of public reads', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        store.addTeam(session, 'event', team);
        store.db.exec('DROP TABLE IF EXISTS discord_message_cleanup; DROP TABLE IF EXISTS discord_notifications; DROP TABLE discord_matrix_flows; DROP TABLE discord_actions; DROP TABLE discord_settings; DROP TABLE team_invite_audit; DROP TABLE team_invite_flows; DROP TABLE team_invite_links; DROP TABLE wall_media; DROP TABLE wall_posts; DROP TABLE wall_settings; DROP TABLE github_oauth_flows; DROP TABLE github_connections; PRAGMA user_version=5;');
        store.close();
        const reopened = new SqliteStore(filename); stores.push(reopened);
        const flow = reopened.beginGitHubFlow(session, 'event', [{ id: 123, account: 'school', type: 'Organization' }]);
        reopened.connectGitHub(session, flow.id, 123, '42');
        const published = publicEvent(reopened.getEvent('event'));
        expect(published.settings.githubApp).toBe(true);
        expect(JSON.stringify(published)).not.toContain('installation_id');
        expect(published.teams[0].name).toBe(team.teamName);
        expect(reopened.githubConnection('event').installation_id).toBe(123);
        reopened.disconnectGitHub(session, 'event');
        expect(reopened.githubConnection('event')).toBeNull();
    });

    test('GitHub flows are session-bound, expiring, single-use and cannot select unauthorized installations', async () => {
        let time = 1000000;
        const { store } = makeStore({ now: () => time }); const a = await account(store, 'a'); const b = await account(store, 'b');
        const flow = store.beginGitHubFlow(a.session, 'a');
        expect(() => store.consumeGitHubFlow(b.session, flow.id)).toThrow('expired or already used');
        expect(store.consumeGitHubFlow(a.session, flow.id).verifier).toBe(flow.verifier);
        expect(() => store.consumeGitHubFlow(a.session, flow.id)).toThrow('expired or already used');
        const selection = store.beginGitHubFlow(a.session, 'a', [{ id: 123, account: 'school', type: 'Organization' }]);
        expect(() => store.connectGitHub(a.session, selection.id, 999, '42')).toThrow('not authorized');
        store.connectGitHub(a.session, selection.id, 123, '42');
        expect(() => store.connectGitHub(a.session, selection.id, 123, '42')).toThrow('expired or already used');
        expect(() => store.disconnectGitHub(b.session, 'a')).toThrow('permission');
        const expiring = store.beginGitHubFlow(a.session, 'a');
        time += 600001;
        expect(() => store.consumeGitHubFlow(a.session, expiring.id)).toThrow('expired or already used');
    });

    test('version 4 upgrade preserves project data and creates an empty startup matrix', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        store.addTeam(session, 'event', { ...team, teamOriginality: 'Original idea' });
        store.db.exec('DROP TABLE IF EXISTS discord_message_cleanup; DROP TABLE IF EXISTS discord_notifications; DROP TABLE discord_matrix_flows; DROP TABLE discord_actions; DROP TABLE discord_settings; DROP TABLE team_invite_audit; DROP TABLE team_invite_flows; DROP TABLE team_invite_links; DROP TABLE wall_media; DROP TABLE wall_posts; DROP TABLE wall_settings; DROP TABLE github_oauth_flows; DROP TABLE github_connections; ALTER TABLE teams DROP COLUMN matrix_mentor_id; ALTER TABLE teams DROP COLUMN startup_matrix; PRAGMA user_version = 4;');
        store.close();
        const upgraded = new SqliteStore(filename); stores.push(upgraded);
        expect(upgraded.getEvent('event').teams[0]).toMatchObject({ originality: 'Original idea', startupMatrix: {}, matrixMentorId: null });
        expect(upgraded.db.query('PRAGMA integrity_check').get().integrity_check).toBe('ok');
    });

    test('partial startup matrix patches persist and survive team and note edits', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        const mentor = store.addMentor(session, 'event', { name: 'Alice' });
        const teamId = store.addTeam(session, 'event', { ...team, teamOriginality: 'Original idea' });
        const document = [{ type: 'paragraph', runs: [{ text: 'A real problem', bold: true }] }];
        const first = store.editStartupMatrix(session, 'event', { teamId, revision: 0, answers: { problem: document }, mentorId: mentor.id });
        expect(first.revision).toBe(1);
        store.editStartupMatrix(session, 'event', { teamId, revision: 1, answers: { solution: document } });
        store.editTeam(session, 'event', { ...team, teamId, revision: 2, stickyNotes: [note] });
        store.editNote(session, 'event', { teamId, noteId: note.id, revision: 3, patch: { content: 'Independent note' } });
        store.close();
        const reopened = new SqliteStore(filename); stores.push(reopened);
        const restored = reopened.getEvent('event').teams[0];
        expect(Object.keys(restored.startupMatrix)).toEqual(['problem', 'solution']);
        expect(restored.startupMatrix.problem[0].runs[0]).toMatchObject({ text: 'A real problem', bold: true });
        expect(restored).toMatchObject({ matrixMentorId: mentor.id, originality: 'Original idea', revision: 4 });
        reopened.editStartupMatrix(session, 'event', { teamId, revision: 4, answers: { problem: [] }, mentorId: null });
        expect(reopened.getEvent('event').teams[0]).toMatchObject({ startupMatrix: { problem: [], solution: first.startupMatrix.problem }, matrixMentorId: null });
    });

    test('startup matrix enforces ownership, mentor scope, revisions and document validation atomically', async () => {
        const { store } = makeStore(); const a = await account(store, 'a'); const b = await account(store, 'b');
        const foreignMentor = store.addMentor(b.session, 'b', { name: 'Other mentor' });
        const teamId = store.addTeam(a.session, 'a', team);
        const input = { teamId, revision: 0, answers: {} };
        expect(() => store.editStartupMatrix(undefined, 'a', input)).toThrow('expired');
        expect(() => store.editStartupMatrix(b.session, 'a', input)).toThrow('permission');
        expect(() => store.editStartupMatrix(b.session, 'b', input)).toThrow('Team not found');
        expect(() => store.editStartupMatrix(a.session, 'a', { ...input, mentorId: foreignMentor.id })).toThrow('this event');
        for (const answers of [null, [], { unknown: [] }, { problem: '<script>alert(1)</script>' }, { problem: [{ type: 'paragraph', runs: [{ text: 'x'.repeat(601) }] }] }]) {
            expect(() => store.editStartupMatrix(a.session, 'a', { ...input, answers })).toThrow();
        }
        expect(store.getEvent('a').teams[0]).toMatchObject({ revision: 0, startupMatrix: {}, matrixMentorId: null });
        store.editStartupMatrix(a.session, 'a', { ...input, answers: { problem: [{ type: 'paragraph', runs: [{ text: 'Saved' }] }] } });
        expect(() => store.editStartupMatrix(a.session, 'a', { ...input, answers: { problem: [] } })).toThrow('mezitím');
        expect(store.getEvent('a').teams[0].startupMatrix.problem[0].runs[0].text).toBe('Saved');
    });

    test('version 3 upgrade preserves team data and adds empty project fields', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        store.addTeam(session, 'event', team);
        store.editTeam(session, 'event', { ...team, oldName: team.teamName, revision: 0, stickyNotes: [note] });
        store.db.exec('DROP TABLE IF EXISTS discord_message_cleanup; DROP TABLE IF EXISTS discord_notifications; DROP TABLE discord_matrix_flows; DROP TABLE discord_actions; DROP TABLE discord_settings; DROP TABLE team_invite_audit; DROP TABLE team_invite_flows; DROP TABLE team_invite_links; DROP TABLE wall_media; DROP TABLE wall_posts; DROP TABLE wall_settings; DROP TABLE github_oauth_flows; DROP TABLE github_connections; ALTER TABLE teams DROP COLUMN matrix_mentor_id; ALTER TABLE teams DROP COLUMN startup_matrix; ALTER TABLE teams DROP COLUMN originality; ALTER TABLE teams DROP COLUMN project_abstract; PRAGMA user_version = 3;');
        store.close();
        const upgraded = new SqliteStore(filename); stores.push(upgraded);
        expect(upgraded.getEvent('event').teams[0]).toMatchObject({ name: team.teamName, originality: '', projectAbstract: [], stickyNotes: [note] });
        expect(upgraded.db.query('PRAGMA integrity_check').get().integrity_check).toBe('ok');
    });

    test('project fields survive creation, edits, note saves and reopening', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        const abstract = [{ type: 'paragraph', runs: [{ text: 'Useful prototype', bold: true }] }, { type: 'bullet', runs: [{ text: 'For students', italic: true }] }];
        const teamId = store.addTeam(session, 'event', { ...team, teamOriginality: 'A new approach', teamProjectAbstract: abstract });
        const stored = store.getEvent('event').teams[0].projectAbstract;
        store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [note] });
        store.editNote(session, 'event', { teamId, noteId: note.id, revision: 1, patch: { content: 'Mentor feedback' } });
        store.close();
        const reopened = new SqliteStore(filename); stores.push(reopened);
        expect(reopened.getEvent('event').teams[0]).toMatchObject({ originality: 'A new approach', projectAbstract: stored });
        reopened.editTeam(session, 'event', { ...team, teamId, revision: 2, teamOriginality: '', teamProjectAbstract: [] });
        expect(reopened.getEvent('event').teams[0]).toMatchObject({ originality: '', projectAbstract: [] });
        reopened.editTeam(session, 'event', { ...team, teamId, revision: 3, teamProjectAbstract: [{ type: 'paragraph', runs: [{ text: '   ' }] }] });
        expect(reopened.getEvent('event').teams[0].projectAbstract).toEqual([]);
    });

    test('abstract validation rejects HTML, malformed documents and oversized text atomically', async () => {
        const { store } = makeStore(); const { session } = await account(store);
        const teamId = store.addTeam(session, 'event', team);
        for (const value of ['<script>alert(1)</script>', null, [{ type: 'script', runs: [] }], [{ type: 'paragraph', runs: [{ text: 'x', bold: 'yes' }] }], [{ type: 'paragraph', runs: [{ text: 'x'.repeat(50001) }] }]]) {
            expect(() => store.editTeam(session, 'event', { ...team, teamId, revision: 0, teamProjectAbstract: value })).toThrow('Abstract');
        }
        expect(() => store.editTeam(session, 'event', { ...team, teamId, revision: 0, teamOriginality: 'x'.repeat(10001) })).toThrow('Originalita');
        expect(store.getEvent('event').teams[0]).toMatchObject({ revision: 0, originality: '', projectAbstract: [] });
    });

    test('version 2 upgrade preserves tracked notes, mentors, creator and priority', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        const mentor = store.addMentor(session, 'event', { name: 'Mentor' });
        const teamId = store.addTeam(session, 'event', team);
        store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [{ ...note, creatorId: mentor.id }] });
        store.db.exec('DROP TABLE IF EXISTS discord_message_cleanup; DROP TABLE IF EXISTS discord_notifications; DROP TABLE discord_matrix_flows; DROP TABLE discord_actions; DROP TABLE discord_settings; DROP TABLE team_invite_audit; DROP TABLE team_invite_flows; DROP TABLE team_invite_links; DROP TABLE wall_media; DROP TABLE wall_posts; DROP TABLE wall_settings; DROP TABLE github_oauth_flows; DROP TABLE github_connections; ALTER TABLE teams DROP COLUMN matrix_mentor_id; ALTER TABLE teams DROP COLUMN startup_matrix; ALTER TABLE teams DROP COLUMN originality; ALTER TABLE teams DROP COLUMN project_abstract; ALTER TABLE notes DROP COLUMN in_kanban; PRAGMA user_version = 2;');
        store.close();
        const upgraded = new SqliteStore(filename); stores.push(upgraded);
        expect(upgraded.getEvent('event').teams[0].stickyNotes[0]).toMatchObject({ ...note, creatorId: mentor.id, inKanban: true });
        expect(upgraded.getEvent('event').mentors).toEqual([mentor]);
    });

    test('plain notes stay plain through editing and can return to Kanban without losing metadata', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        const teamId = store.addTeam(session, 'event', team);
        store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [{ ...note, inKanban: false }] });
        store.editNote(session, 'event', { teamId, noteId: note.id, revision: 1, patch: { content: 'Team observation' } });
        expect(store.getEvent('event').teams[0].stickyNotes[0].inKanban).toBe(false);
        expect(() => store.editNote(session, 'event', { teamId, noteId: note.id, revision: 2, patch: { inKanban: 'false' } })).toThrow('Kanban');
        expect(() => store.editTeam(session, 'event', { ...team, teamId, revision: 2, stickyNotes: [{ ...note, inKanban: 1 }] })).toThrow('Kanban');
        store.editNote(session, 'event', { teamId, noteId: note.id, revision: 2, patch: { inKanban: true } });
        store.close();
        const reopened = new SqliteStore(filename); stores.push(reopened);
        expect(reopened.getEvent('event').teams[0].stickyNotes[0]).toMatchObject({ inKanban: true, priority: 'high', status: 'To Do', content: 'Team observation' });
    });

    test('version 1 migration preserves existing events and notes', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        const teamId = store.addTeam(session, 'event', team);
        store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [note] });
        // Recreate the prior schema, including an existing note with no attribution.
        store.db.exec('DROP TABLE IF EXISTS discord_message_cleanup; DROP TABLE IF EXISTS discord_notifications; DROP TABLE discord_matrix_flows; DROP TABLE discord_actions; DROP TABLE discord_settings; DROP TABLE team_invite_audit; DROP TABLE team_invite_flows; DROP TABLE team_invite_links; DROP TABLE wall_media; DROP TABLE wall_posts; DROP TABLE wall_settings; DROP TABLE github_oauth_flows; DROP TABLE github_connections; ALTER TABLE teams DROP COLUMN matrix_mentor_id; ALTER TABLE teams DROP COLUMN startup_matrix; ALTER TABLE teams DROP COLUMN originality; ALTER TABLE teams DROP COLUMN project_abstract; ALTER TABLE notes DROP COLUMN in_kanban; ALTER TABLE notes DROP COLUMN creator_id; ALTER TABLE notes DROP COLUMN type; DROP TABLE mentors; PRAGMA user_version = 1;');
        store.close();
        const upgraded = new SqliteStore(filename); stores.push(upgraded);
        expect(upgraded.db.query('PRAGMA user_version').get().user_version).toBe(15);
        expect(upgraded.getEvent('event').teams[0].stickyNotes[0]).toMatchObject({ ...note, type: 'mentor_note', creatorId: null, inKanban: true });
        expect(upgraded.getEvent('event').mentors).toEqual([]);
        expect((await upgraded.checkPassword('event', 'password123')).event).toBe('event');
    });

    test('mentor attribution and help requests survive both save paths and reopening', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        const mentor = store.addMentor(session, 'event', { name: '  Alice Mentor  ' });
        const teamId = store.addTeam(session, 'event', team);
        store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [{ ...note, type: 'help_request', creatorId: mentor.id }] });
        store.editNote(session, 'event', { teamId, noteId: note.id, revision: 1, patch: { status: 'In Progress' } });
        store.close();
        const reopened = new SqliteStore(filename); stores.push(reopened);
        expect(reopened.getEvent('event').mentors).toEqual([{ ...mentor, name: 'Alice Mentor' }]);
        expect(reopened.getEvent('event').teams[0].stickyNotes[0]).toMatchObject({ type: 'help_request', creatorId: mentor.id, status: 'In Progress' });
        reopened.editNote(session, 'event', { teamId, noteId: note.id, revision: 2, patch: { creatorId: null, type: 'mentor_note' } });
        expect(reopened.getEvent('event').teams[0].stickyNotes[0]).toMatchObject({ type: 'mentor_note', creatorId: null });
    });

    test('mentor creation and attribution enforce event scope and reject invalid writes atomically', async () => {
        const { store } = makeStore(); const a = await account(store, 'a'); const b = await account(store, 'b');
        const mentor = store.addMentor(a.session, 'a', { name: 'Alice' });
        expect(() => store.addMentor(undefined, 'a', { name: 'Guest' })).toThrow('expired');
        expect(() => store.addMentor(a.session, 'b', { name: 'Wrong event' })).toThrow('permission');
        expect(() => store.addMentor(a.session, 'a', { name: 'alice' })).toThrow('already exists');
        expect(() => store.addMentor(a.session, 'a', { name: '  ' })).toThrow('name');
        const teamId = store.addTeam(b.session, 'b', team);
        store.editTeam(b.session, 'b', { ...team, teamId, revision: 0, stickyNotes: [note] });
        const input = { teamId, noteId: note.id, revision: 1 };
        expect(() => store.editNote(b.session, 'b', { ...input, patch: { creatorId: mentor.id } })).toThrow('this event');
        expect(() => store.editNote(b.session, 'b', { ...input, patch: { type: 'invalid' } })).toThrow('type');
        expect(() => store.editTeam(b.session, 'b', { ...team, teamId, revision: 1, stickyNotes: [{ ...note, creatorId: mentor.id }] })).toThrow('this event');
        expect(store.getEvent('b').teams[0]).toMatchObject({ revision: 1, stickyNotes: [{ creatorId: null, type: 'mentor_note' }] });
    });

    test('reopen preserves password hashes, event metadata, teams and notes', async () => {
        const { store, filename } = makeStore();
        const { session } = await account(store);
        store.addTeam(session, 'event', team);
        store.editTeam(session, 'event', { ...team, oldName: 'Team', revision: 0, stickyNotes: [note] });
        const hash = store.getEvent('event').settings.password;
        expect(hash).not.toBe('password123');
        store.close();
        const reopened = new SqliteStore(filename); stores.push(reopened);
        expect((await reopened.checkPassword('event', 'password123')).settings.password).toBe(hash);
        expect(reopened.getEvent('event').teams[0].stickyNotes[0]).toMatchObject(note);
        expect(reopened.getSession(session).username).toBe('event');
        expect(publicEvent(reopened.getEvent('event')).settings.password).toBeUndefined();
    });

    test('ownership and explicit session expiry protect writes', async () => {
        let time = 1000000;
        const { store } = makeStore({ now: () => time });
        const a = await account(store, 'a'); await account(store, 'b');
        expect(() => store.addTeam(a.session, 'b', team)).toThrow('permission');
        expect(() => store.addTeam(undefined, 'a', team)).toThrow('expired');
        time += 3600000;
        expect(store.getSession(a.session).eventId).toBe(a.id);
        time += 23 * 3600000 - 1;
        expect(store.getSession(a.session).eventId).toBe(a.id);
        time += 1;
        expect(store.getSession(a.session)).toBeNull();
        expect(() => store.addTeam(a.session, 'a', team)).toThrow('expired');
    });

    test('rename preserves only current session; password changes rotate all sessions', async () => {
        const { store } = makeStore(); const { id, session } = await account(store);
        const other = store.createSession(id);
        await store.updateSetting(session, 'event', 'event', 'renamed');
        expect(store.exists('event')).toBe(false);
        expect(store.getSession(session).username).toBe('renamed');
        expect(store.getSession(other)).toBeNull();
        const third = store.createSession(id);
        const rotated = await store.updateSetting(session, 'renamed', 'password', 'new-password', 'password123');
        expect(store.getSession(session)).toBeNull(); expect(store.getSession(third)).toBeNull();
        expect(store.getSession(rotated).username).toBe('renamed');
        await expect(store.checkPassword('renamed', 'password123')).rejects.toThrow('Wrong password');
        await expect(store.checkPassword('renamed', 'new-password')).resolves.toBeDefined();
    });

    test('cross-event settings are rejected instead of editing the session event', async () => {
        const { store } = makeStore(); const { session } = await account(store, 'a'); await account(store, 'b');
        await expect(store.updateSetting(session, 'b', 'logo', 'https://example.com/b.png')).rejects.toThrow('permission');
        expect(store.getEvent('a').logo).toBe(''); expect(store.getEvent('b').logo).toBe('');
    });

    test('duplicate names, foreign IDs and stale revisions cannot corrupt notes', async () => {
        const { store } = makeStore(); const { session } = await account(store);
        const teamId = store.addTeam(session, 'event', team);
        store.addTeam(session, 'event', { ...team, teamName: 'Other' });
        expect(() => store.addTeam(session, 'event', team)).toThrow('already exists');
        expect(store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [note] })).toBe(1);
        expect(() => store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [] })).toThrow('Reload');
        expect(() => store.editTeam(session, 'event', { ...team, teamName: 'Other', oldName: 'Other', revision: 0, stickyNotes: [note] })).toThrow('another team');
        expect(() => store.editTeam(session, 'event', { ...team, teamId, revision: 1, stickyNotes: [{ ...note, priority: 'invalid' }] })).toThrow('priority');
        expect(store.getEvent('event').teams[0].stickyNotes).toHaveLength(1);
        store.deleteTeam(session, 'event', { teamId });
        expect(store.db.query('SELECT COUNT(*) AS n FROM notes').get().n).toBe(0);
    });

    test('Kanban edits target one note and persist without replacing other team data', async () => {
        const { store, filename } = makeStore(); const { session } = await account(store);
        const teamId = store.addTeam(session, 'event', team);
        store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [note, { ...note, id: 'note-2', content: 'Keep this' }] });
        const moved = store.editNote(session, 'event', { teamId, noteId: note.id, revision: 1, patch: { status: 'In Progress' } });
        expect(moved.revision).toBe(2);
        expect(moved.note.status).toBe('In Progress');
        store.editNote(session, 'event', { teamId, noteId: note.id, revision: 2,
            patch: { content: 'Finished task', priority: 'low', status: 'Done' } });
        store.close();
        const reopened = new SqliteStore(filename); stores.push(reopened);
        const restored = reopened.getEvent('event').teams[0];
        expect(restored.description).toBe(team.teamDescription);
        expect(restored.revision).toBe(3);
        expect(restored.stickyNotes[0]).toMatchObject({ id: note.id, content: 'Finished task', priority: 'low', status: 'Done' });
        expect(restored.stickyNotes[1]).toMatchObject({ id: 'note-2', content: 'Keep this' });
        reopened.deleteNote(session, 'event', { teamId, noteId: note.id, revision: 3 });
        expect(reopened.getEvent('event').teams[0].stickyNotes.map(n => n.id)).toEqual(['note-2']);
    });

    test('Kanban rejects unauthorized, stale, invalid and cross-team note writes atomically', async () => {
        const { store } = makeStore(); const { session } = await account(store);
        const other = await account(store, 'other-event');
        const teamId = store.addTeam(session, 'event', team);
        const otherTeamId = store.addTeam(session, 'event', { ...team, teamName: 'Other team' });
        store.editTeam(session, 'event', { ...team, teamId, revision: 0, stickyNotes: [note] });
        const input = { teamId, noteId: note.id, revision: 1, patch: { status: 'Done' } };
        expect(() => store.editNote(undefined, 'event', input)).toThrow('expired');
        expect(() => store.editNote(other.session, 'event', input)).toThrow('permission');
        expect(() => store.editNote(session, 'event', { ...input, teamId: otherTeamId, revision: 0 })).toThrow('Note not found');
        expect(() => store.editNote(session, 'event', { ...input, patch: { status: 'Invalid' } })).toThrow('status');
        expect(() => store.editNote(session, 'event', { ...input, patch: { id: 'steal' } })).toThrow('Invalid note update');
        store.editNote(session, 'event', input);
        expect(() => store.editNote(session, 'event', { ...input, patch: { content: 'Stale overwrite' } })).toThrow('Reload');
        expect(() => store.deleteNote(session, 'event', input)).toThrow('Reload');
        expect(() => store.editTeam(session, 'event', { ...team, teamId, revision: 1, stickyNotes: [] })).toThrow('Reload');
        expect(store.getEvent('event').teams[0].stickyNotes[0]).toMatchObject({ content: note.content, status: 'Done' });
        expect(store.getEvent('event').teams[0].revision).toBe(2);
    });

    test('private Mongo export import preserves credentials and IDs, and rolls back failures', async () => {
        const { store } = makeStore(); await account(store, 'source');
        // Fixture produced by the original npm bcrypt 6 implementation.
        const hash = '$2b$10$Z2W9mDEERKcl1fE8eXhNPeZW7WEcy5tFl5cnnRbrSuMpWYPJ0i5fW';
        const doc = { _id: { $oid: 'old-event-id' }, event: 'imported', settings: { password: hash, githubToken: 'private-token' },
            createdAt: { $date: '2026-01-01T00:00:00.000Z' }, teams: [{ _id: 'old-team-id', name: 'Imported team', color: '#3081E0', stickyNotes: [note] }] };
        expect(importMongoEvents(store, [doc])).toEqual({ events: 1, teams: 1, notes: 1 });
        expect((await store.checkPassword('imported', 'password123'))._id).toBe('old-event-id');
        expect(store.getEvent('imported').teams[0]._id).toBe('old-team-id');
        expect(publicEvent(store.getEvent('imported')).settings.githubToken).toBe('x'.repeat(13));
        expect(() => importMongoEvents(store, [{ ...doc, _id: 'new-id', event: 'rollback', teams: [] }, doc])).toThrow('already exists');
        expect(store.exists('rollback')).toBe(false);
        expect(() => importMongoEvents(store, [{ ...doc, event: 'public-backup', settings: {} }])).toThrow('bcrypt');
    });

    test('new passwords reject bcrypt truncation; legacy truncated hashes still verify', async () => {
        const { store } = makeStore();
        await expect(store.createEvent('too-long', 'x'.repeat(80))).rejects.toThrow('72');
        const hash = await Bun.password.hash('x'.repeat(72), { algorithm: 'bcrypt', cost: 10 });
        importMongoEvents(store, [{ event: 'legacy-long', settings: { password: hash }, teams: [] }]);
        await expect(store.checkPassword('legacy-long', 'x'.repeat(80))).resolves.toBeDefined();
    });

    test('VACUUM snapshot restores committed WAL data independently', async () => {
        const { store, filename } = makeStore(); await account(store);
        store.db.query('VACUUM INTO ?').run(filename + '.backup');
        const snapshot = new SqliteStore(filename + '.backup'); stores.push(snapshot);
        expect(snapshot.exists('event')).toBe(true);
        expect(snapshot.db.query('PRAGMA integrity_check').get().integrity_check).toBe('ok');
    });
});

test('critical priority persists through whole-team and individual-note writes without changing team identity',async()=>{
 const {store,filename}=makeStore();const {session}=await account(store);
 const teamId=store.addTeam(session,'event',team);
 store.editTeam(session,'event',{...team,teamId,revision:0,stickyNotes:[{...note,priority:'critical'}]});
 expect(store.getEvent('event').teams[0].stickyNotes[0].priority).toBe('critical');
 store.editNote(session,'event',{teamId,noteId:note.id,revision:1,patch:{priority:'high'}});
 store.editNote(session,'event',{teamId,noteId:note.id,revision:2,patch:{priority:'critical'}});
 store.close();const reopened=new SqliteStore(filename);stores.push(reopened);
 const restored=reopened.getEvent('event').teams[0];
 expect(restored.color).toBe(team.teamColor);expect(restored.stickyNotes[0]).toMatchObject({...note,priority:'critical'});
});
