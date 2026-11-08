import { randomUUID } from 'node:crypto';
import { StorageError } from './sqlite.js';

function id(value) { return typeof value === 'string' ? value : value?.$oid || randomUUID(); }
function date(value) { return new Date(value?.$date ?? value ?? Date.now()).toISOString(); }

// Import a private mongoexport JSON array, not the public event backup (which lacks credentials).
// All documents are imported in one transaction. Existing events are never overwritten.
export function importMongoEvents(store, documents) {
    if (!Array.isArray(documents)) throw new StorageError(400, 'Expected a mongoexport JSON array');
    return store.db.transaction(() => {
        let teams = 0, notes = 0;
        for (const event of documents) {
            if (typeof event.event !== 'string' || !event.event.trim() || !Array.isArray(event.teams) ||
                !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(event.settings?.password || '')) {
                throw new StorageError(400, 'Each imported event needs a name, teams and its original bcrypt password hash');
            }
            if (store.exists(event.event)) throw new StorageError(400, 'An imported event already exists; nothing was imported');
            const eventId = id(event._id);
            store.db.query(`INSERT INTO events (id, name, password_hash, github_token, logo, color, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(eventId, event.event, event.settings.password, event.settings.githubToken || '', event.logo || '',
                    event.color || '', date(event.createdAt), date(event.updatedAt));
            for (const [position, team] of event.teams.entries()) {
                const teamId = id(team._id);
                if (typeof team.name !== 'string' || !team.name.trim() || !/^#[\da-f]{6}$/i.test(team.color)) {
                    throw new StorageError(400, 'Invalid imported team');
                }
                store.db.query(`INSERT INTO teams (id, event_id, name, color, github, description, position)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`)
                    .run(teamId, eventId, team.name, team.color, team.github || '', team.description || '', position);
                teams++;
                for (const [notePosition, note] of (team.stickyNotes || []).entries()) {
                    if (!['low', 'medium', 'high'].includes(note.priority || 'medium')) throw new StorageError(400, 'Invalid imported note priority');
                    store.db.query(`INSERT INTO notes (id, team_id, content, color, priority, status, position)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`)
                        .run(id(note.id || note._id), teamId, note.content || '', note.color || '#ffeb3b',
                            note.priority || 'medium', note.status || 'To Do', notePosition);
                    notes++;
                }
            }
        }
        return { events: documents.length, teams, notes };
    })();
}
