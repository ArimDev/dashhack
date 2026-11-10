import { Database } from 'bun:sqlite';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NOTE_STATUSES, NOTE_PRIORITIES } from '../../shared/noteStatuses.js';
import { STARTUP_MATRIX_FIELDS, matrixAnswerError } from '../../shared/startupMatrix.js';

export class StorageError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

function text(value, label, max = 1000, required = false) {
    if (value === undefined && !required) return '';
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
        throw new StorageError(400, `Invalid ${label}`);
    }
    return value;
}

function eventName(value) {
    const name = text(value, 'event name', 100, true);
    if (!/^[\p{L}\p{N}_ -]+$/u.test(name) || name !== name.trim()) {
        throw new StorageError(400, 'Use letters, numbers, spaces, underscores or hyphens for the event name');
    }
    return name;
}

function password(value) {
    text(value, 'password', 200, true);
    if (Buffer.byteLength(value) > 72) throw new StorageError(400, 'Password must fit within 72 UTF-8 bytes');
    return value;
}

function abstractFields(value = []) {
    if (!Array.isArray(value) || value.length > 500) throw new StorageError(400, 'Invalid Project Abstract');
    let length = 0, runs = 0;
    const blocks = value.map(block => {
        if (!block || !['paragraph', 'bullet'].includes(block.type) || !Array.isArray(block.runs)) {
            throw new StorageError(400, 'Invalid Project Abstract block');
        }
        return { type: block.type, runs: block.runs.map(run => {
            if (!run || typeof run.text !== 'string' ||
                (run.bold !== undefined && typeof run.bold !== 'boolean') ||
                (run.italic !== undefined && typeof run.italic !== 'boolean')) {
                throw new StorageError(400, 'Invalid Project Abstract text');
            }
            length += run.text.length; runs++;
            if (length > 50000 || runs > 5000) throw new StorageError(400, 'Project Abstract is too long');
            return { text: run.text, bold: !!run.bold, italic: !!run.italic };
        }) };
    });
    return blocks.some(block => block.runs.some(run => run.text.trim())) ? blocks : [];
}

function teamFields(input) {
    const color = text(input.teamColor, 'team color', 7, true);
    if (!/^#[\da-f]{6}$/i.test(color)) throw new StorageError(400, 'Invalid team color');
    return {
        name: text(input.teamName, 'team name', 200, true), color,
        github: text(input.teamGithub, 'repository URL', 2000),
        description: text(input.teamDescription, 'team description', 10000),
        originality: text(input.teamOriginality, 'Originalita', 10000),
        projectAbstract: abstractFields(input.teamProjectAbstract),
    };
}

function noteFields(note) {
    if (!note || typeof note !== 'object') throw new StorageError(400, 'Invalid note');
    if (!NOTE_PRIORITIES.includes(note.priority ?? 'medium')) throw new StorageError(400, 'Invalid note priority');
    const color = text(note.color ?? '#ffeb3b', 'note color', 7, true);
    if (!/^#[\da-f]{6}$/i.test(color)) throw new StorageError(400, 'Invalid note color');
    const type = note.type ?? 'mentor_note';
    if (!['mentor_note', 'help_request'].includes(type)) throw new StorageError(400, 'Invalid note type');
    const creatorId = note.creatorId == null || note.creatorId === '' ? null : text(note.creatorId, 'creator ID', 100, true);
    const inKanban = note.inKanban === undefined ? true : note.inKanban;
    if (typeof inKanban !== 'boolean') throw new StorageError(400, 'Invalid Kanban selection');
    return {
        type, creatorId, inKanban,
        id: text(note.id, 'note ID', 100, true),
        content: text(note.content ?? '', 'note content', 50000), color,
        priority: note.priority ?? 'medium', status: text(note.status ?? 'To Do', 'note status', 100),
    };
}

export function matrixAnswers(answers) {
    const allowed = STARTUP_MATRIX_FIELDS.map(field => field.key);
    if (!answers || typeof answers !== 'object' || Array.isArray(answers) ||
        Object.keys(answers).some(key => !allowed.includes(key))) throw new StorageError(400, 'Neplatná pole startupové matice');
    const patch = {};
    for (const [key, value] of Object.entries(answers)) {
        try {
            patch[key] = abstractFields(value);
            const error = matrixAnswerError(patch[key]);
            if (error) throw new StorageError(400, error);
        }
        catch (failure) {
            if (failure instanceof StorageError) throw new StorageError(400, `${STARTUP_MATRIX_FIELDS.find(field => field.key === key).label}: ${failure.message}`);
            throw failure;
        }
    }
    return patch;
}

// One connection per application process. Transactions contain no asynchronous work.
export class SqliteStore {
    constructor(filename, { now = Date.now } = {}) {
        this.filename = filename === ':memory:' ? null : resolve(filename);
        if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true, mode: 0o700 });
        this.db = new Database(filename, { create: true, strict: true });
        if (filename !== ':memory:') chmodSync(filename, 0o600);
        this.now = now;
        this.db.exec(`
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = FULL;
            PRAGMA cache_size = -2048;
            PRAGMA mmap_size = 0;
        `);
        const version = this.db.query('PRAGMA user_version').get().user_version;
        if (version > 10) { this.db.close(); throw new Error('SQLite schema is newer than this app supports'); }
        if (version === 0) this.db.transaction(() => {
            this.db.exec(`
                CREATE TABLE events (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL, github_token TEXT NOT NULL DEFAULT '',
                    logo TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE teams (
                    id TEXT PRIMARY KEY,
                    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    name TEXT NOT NULL, color TEXT NOT NULL, github TEXT NOT NULL DEFAULT '',
                    description TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 0,
                    position INTEGER NOT NULL, UNIQUE(event_id, name)
                );
                CREATE TABLE notes (
                    id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                    content TEXT NOT NULL, color TEXT NOT NULL, priority TEXT NOT NULL,
                    status TEXT NOT NULL, position INTEGER NOT NULL
                );
                CREATE INDEX notes_team ON notes(team_id, position);
                CREATE INDEX teams_event ON teams(event_id, position);
                CREATE TABLE sessions (
                    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    expires_at INTEGER NOT NULL
                );
                CREATE INDEX sessions_expiry ON sessions(expires_at);
                CREATE INDEX sessions_event ON sessions(event_id);
                PRAGMA user_version = 1;
            `);
        })();
        if (version < 2) this.db.transaction(() => {
            this.db.exec(`
                CREATE TABLE mentors (
                    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    name TEXT NOT NULL COLLATE NOCASE, UNIQUE(event_id, name)
                );
                ALTER TABLE notes ADD COLUMN type TEXT NOT NULL DEFAULT 'mentor_note'
                    CHECK(type IN ('mentor_note', 'help_request'));
                ALTER TABLE notes ADD COLUMN creator_id TEXT REFERENCES mentors(id);
                PRAGMA user_version = 2;
            `);
        })();
        if (version < 3) this.db.transaction(() => {
            this.db.exec(`ALTER TABLE notes ADD COLUMN in_kanban INTEGER NOT NULL DEFAULT 1 CHECK(in_kanban IN (0, 1));
                PRAGMA user_version = 3;`);
        })();
        if (version < 4) this.db.transaction(() => {
            this.db.exec(`ALTER TABLE teams ADD COLUMN originality TEXT NOT NULL DEFAULT '';
                ALTER TABLE teams ADD COLUMN project_abstract TEXT NOT NULL DEFAULT '[]';
                PRAGMA user_version = 4;`);
        })();
        if (version < 5) this.db.transaction(() => {
            this.db.exec(`ALTER TABLE teams ADD COLUMN startup_matrix TEXT NOT NULL DEFAULT '{}';
                ALTER TABLE teams ADD COLUMN matrix_mentor_id TEXT REFERENCES mentors(id);
                PRAGMA user_version = 5;`);
        })();
        if (version < 6) this.db.transaction(() => {
            this.db.exec(`CREATE TABLE github_connections (
                event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
                installation_id INTEGER NOT NULL, account TEXT NOT NULL, account_type TEXT NOT NULL,
                app_id TEXT NOT NULL
            );
            CREATE TABLE github_oauth_flows (
                id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL, verifier TEXT NOT NULL, choices TEXT
            );
            CREATE INDEX github_flows_expiry ON github_oauth_flows(expires_at);
            PRAGMA user_version = 6;`);
        })();
        if (version < 7) this.db.transaction(() => {
            this.db.exec(`CREATE TABLE wall_settings (
                event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
                settings TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 0,
                last_poll_at INTEGER, last_poll_error TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE wall_posts (
                event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, id TEXT NOT NULL,
                platform TEXT NOT NULL CHECK(platform IN ('manual','x','instagram')),
                author_name TEXT NOT NULL, handle TEXT NOT NULL, text TEXT NOT NULL,
                image_url TEXT NOT NULL, video_url TEXT NOT NULL, source_url TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
                hidden INTEGER NOT NULL DEFAULT 0, pinned INTEGER NOT NULL DEFAULT 0,
                deleted INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL, PRIMARY KEY(event_id,id)
            );
            CREATE INDEX wall_posts_feed ON wall_posts(event_id,deleted,status,created_at);
            CREATE TABLE wall_media (
                event_id TEXT NOT NULL, post_id TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL,
                PRIMARY KEY(event_id,post_id),
                FOREIGN KEY(event_id,post_id) REFERENCES wall_posts(event_id,id) ON DELETE CASCADE
            );
            PRAGMA user_version = 7;`);
        })();
        if (version < 8) this.db.transaction(() => {
            this.db.exec(`CREATE TABLE team_invite_links (
                id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                repository TEXT NOT NULL, installation_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
                state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','revoked'))
            );
            CREATE INDEX team_invite_event ON team_invite_links(event_id,created_at);
            CREATE UNIQUE INDEX team_invite_active ON team_invite_links(team_id) WHERE state='active';
            CREATE TABLE team_invite_flows (
                id TEXT PRIMARY KEY, link_id TEXT NOT NULL REFERENCES team_invite_links(id) ON DELETE CASCADE,
                browser_hash TEXT NOT NULL, verifier TEXT NOT NULL,
                expires_at INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'started',
                github_user_id TEXT NOT NULL DEFAULT '', username TEXT NOT NULL DEFAULT '',
                result TEXT
            );
            CREATE INDEX team_invite_flows_expiry ON team_invite_flows(expires_at);
            CREATE TABLE team_invite_audit (
                id TEXT PRIMARY KEY, event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
                team_id TEXT NOT NULL DEFAULT '', link_id TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL, action TEXT NOT NULL, outcome TEXT NOT NULL,
                username TEXT NOT NULL DEFAULT '', verified INTEGER NOT NULL DEFAULT 0,
                github_user_id TEXT NOT NULL DEFAULT '', actor TEXT NOT NULL DEFAULT '',
                ip TEXT NOT NULL DEFAULT '', user_agent TEXT NOT NULL DEFAULT '', request_id TEXT NOT NULL
            );
            CREATE INDEX team_invite_audit_event ON team_invite_audit(event_id,created_at);
            PRAGMA user_version = 8;`);
        })();

        if (version < 9) this.db.transaction(() => {
            this.db.exec(`CREATE TABLE discord_settings (
                event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
                application_id TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL,
                guild_id TEXT NOT NULL UNIQUE, channels TEXT NOT NULL DEFAULT '{}',
                enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
                link_secret TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE discord_actions (
                interaction_id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL, user_name TEXT NOT NULL, kind TEXT NOT NULL,
                created_at INTEGER NOT NULL, result TEXT NOT NULL DEFAULT '{}'
            );
            CREATE INDEX discord_actions_user ON discord_actions(event_id,user_id,created_at);
            CREATE INDEX discord_actions_team ON discord_actions(event_id,team_id,created_at);
            CREATE TABLE discord_matrix_flows (
                id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                channel_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL,
                created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
                claimed_at INTEGER, session_hash TEXT
            );
            CREATE INDEX discord_flows_expiry ON discord_matrix_flows(expires_at);
            PRAGMA user_version = 9;`);
        })();

        if (version < 10) this.db.transaction(() => {
            this.db.exec(`CREATE TABLE discord_notifications (
                note_id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                author TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'pending'
                    CHECK(state IN ('pending','sending','sent','failed')),
                attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
                next_attempt_at INTEGER NOT NULL, last_attempt_at INTEGER,
                message_id TEXT NOT NULL DEFAULT '', last_error TEXT NOT NULL DEFAULT ''
            );
            CREATE INDEX discord_notification_queue ON discord_notifications(state,next_attempt_at);
            PRAGMA user_version = 10;`);
        })();

    }

    close() { this.db.close(); }
    timestamp() { return new Date(this.now()).toISOString(); }
    exists(name) { return typeof name === 'string' && !!this.db.query('SELECT 1 FROM events WHERE name = ?').get(name); }

    getEvent(name) {
        if (typeof name !== 'string') return null;
        const row = this.db.query('SELECT * FROM events WHERE name = ?').get(name);
        if (!row) return null;
        const teams = this.db.query('SELECT * FROM teams WHERE event_id = ? ORDER BY position, id').all(row.id);
        const notes = this.db.query(`SELECT notes.* FROM notes JOIN teams ON teams.id = notes.team_id
            WHERE teams.event_id = ? ORDER BY notes.position, notes.id`).all(row.id);
        const grouped = new Map();
        for (const note of notes) {
            if (!grouped.has(note.team_id)) grouped.set(note.team_id, []);
            grouped.get(note.team_id).push({ _id: note.id, id: note.id, content: note.content,
                color: note.color, priority: note.priority, status: note.status,
                type: note.type, creatorId: note.creator_id, inKanban: !!note.in_kanban });
        }
        return {
            _id: row.id, event: row.name, logo: row.logo, color: row.color,
            createdAt: row.created_at, updatedAt: row.updated_at,
            settings: { password: row.password_hash, githubToken: row.github_token,
                githubApp: !!this.db.query('SELECT 1 FROM github_connections WHERE event_id=?').get(row.id) },
            mentors: this.db.query('SELECT id, name FROM mentors WHERE event_id = ? ORDER BY name, id').all(row.id),
            teams: teams.map(team => ({ _id: team.id, name: team.name, color: team.color,
                github: team.github, description: team.description, revision: team.revision,
                originality: team.originality, projectAbstract: JSON.parse(team.project_abstract),
                startupMatrix: JSON.parse(team.startup_matrix), matrixMentorId: team.matrix_mentor_id,
                stickyNotes: grouped.get(team.id) || [] })),
        };
    }

    async createEvent(name, pass) {
        name = eventName(name); password(pass);
        const hash = await Bun.password.hash(pass, { algorithm: 'bcrypt', cost: 10 });
        return this.db.transaction(() => {
            if (this.exists(name)) throw new StorageError(400, 'Username already exists');
            const id = randomUUID(), now = this.timestamp();
            this.db.query('INSERT INTO events (id, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
                .run(id, name, hash, now, now);
            return id;
        })();
    }

    async checkPassword(name, pass) {
        const event = this.getEvent(name);
        if (!event) throw new StorageError(404, 'Event not found');
        if (typeof pass !== 'string' || !await Bun.password.verify(Buffer.from(pass).subarray(0, 72), event.settings.password)) {
            throw new StorageError(401, 'Wrong password');
        }
        return event;
    }

    createSession(eventId) {
        this.db.query('DELETE FROM sessions WHERE expires_at <= ?').run(this.now());
        const id = randomUUID();
        this.db.query('INSERT INTO sessions (id, event_id, expires_at) VALUES (?, ?, ?)').run(id, eventId, this.now() + 3600000);
        return id;
    }

    getSession(id) {
        if (typeof id !== 'string') return null;
        return this.db.query(`SELECT sessions.id AS sessionID, sessions.event_id AS eventId,
            events.name AS username FROM sessions JOIN events ON events.id = sessions.event_id
            WHERE sessions.id = ? AND expires_at > ?`).get(id, this.now());
    }

    deleteSession(id) { if (typeof id === 'string') this.db.query('DELETE FROM sessions WHERE id = ?').run(id); }

    authorize(sessionId, name) {
        const session = this.getSession(sessionId);
        if (!session) throw new StorageError(401, 'Session not found or expired');
        if (session.username !== name) throw new StorageError(403, 'You do not have permission to modify this event');
        return session.eventId;
    }

    async updateSetting(sessionId, name, setting, value, oldPassword) {
        const id = this.authorize(sessionId, name);
        if (setting === 'password') {
            await this.checkPassword(name, oldPassword); password(value);
            const hash = await Bun.password.hash(value, { algorithm: 'bcrypt', cost: 10 });
            return this.db.transaction(() => {
                this.authorize(sessionId, name);
                this.db.query('UPDATE events SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, this.timestamp(), id);
                this.db.query('DELETE FROM sessions WHERE event_id = ?').run(id);
                return this.createSession(id);
            })();
        }
        return this.db.transaction(() => {
            if (setting === 'event') {
                const next = eventName(value);
                if (next !== name && this.exists(next)) throw new StorageError(400, 'Event name is occupied');
                this.db.query('UPDATE events SET name = ?, updated_at = ? WHERE id = ?').run(next, this.timestamp(), id);
                this.db.query('DELETE FROM sessions WHERE event_id = ? AND id != ?').run(id, sessionId);
            } else if (setting === 'githubToken') {
                this.db.query('UPDATE events SET github_token = ?, updated_at = ? WHERE id = ?')
                    .run(text(value, 'GitHub token', 1000), this.timestamp(), id);
            } else if (setting === 'logo') {
                this.db.query('UPDATE events SET logo = ?, updated_at = ? WHERE id = ?')
                    .run(text(value, 'logo URL', 2000), this.timestamp(), id);
            } else throw new StorageError(400, 'Unknown setting');
            return null;
        })();
    }

    addTeam(sessionId, name, input) {
        const eventId = this.authorize(sessionId, name), team = teamFields(input);
        return this.db.transaction(() => {
            if (this.db.query('SELECT 1 FROM teams WHERE event_id = ? AND name = ?').get(eventId, team.name)) {
                throw new StorageError(400, 'Team name already exists');
            }
            const id = randomUUID();
            const position = this.db.query('SELECT COALESCE(MAX(position), -1) + 1 AS n FROM teams WHERE event_id = ?').get(eventId).n;
            this.db.query('INSERT INTO teams (id, event_id, name, color, github, description, position, originality, project_abstract) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(id, eventId, team.name, team.color, team.github, team.description, position, team.originality, JSON.stringify(team.projectAbstract));
            this.touch(eventId);
            return id;
        })();
    }

    githubConnection(name) {
        return this.db.query(`SELECT github_connections.* FROM github_connections JOIN events ON events.id=event_id WHERE events.name=?`).get(name);
    }

    beginGitHubFlow(sessionId, name, choices = null) {
        const eventId = this.authorize(sessionId, name);
        return this.db.transaction(() => {
            this.db.query('DELETE FROM github_oauth_flows WHERE expires_at <= ? OR session_id = ?').run(this.now(), sessionId);
            const flow = { id: randomBytes(32).toString('base64url'), verifier: randomBytes(32).toString('base64url') };
            this.db.query('INSERT INTO github_oauth_flows (id,event_id,session_id,expires_at,verifier,choices) VALUES (?,?,?,?,?,?)')
                .run(flow.id, eventId, sessionId, this.now() + 600000, flow.verifier, choices === null ? null : JSON.stringify(choices));
            return flow;
        })();
    }

    readGitHubFlow(sessionId, id, selection = false) {
        const session = this.getSession(sessionId);
        if (!session) throw new StorageError(401, 'Log in to the event again before connecting GitHub');
        const flow = typeof id === 'string' ? this.db.query('SELECT * FROM github_oauth_flows WHERE id=? AND session_id=? AND event_id=? AND expires_at>?')
            .get(id, sessionId, session.eventId, this.now()) : null;
        if (!flow || (flow.choices !== null) !== selection) throw new StorageError(400, 'GitHub connection expired or already used. Please connect again.');
        return { ...flow, event: session.username, choices: flow.choices === null ? null : JSON.parse(flow.choices) };
    }

    consumeGitHubFlow(sessionId, id, selection = false) {
        return this.db.transaction(() => {
            const flow = this.readGitHubFlow(sessionId, id, selection);
            this.db.query('DELETE FROM github_oauth_flows WHERE id=?').run(id);
            return flow;
        })();
    }

    connectGitHub(sessionId, selectionId, installationId, appId) {
        return this.db.transaction(() => {
            const flow = this.readGitHubFlow(sessionId, selectionId, true);
            const choice = flow.choices.find(choice => choice.id === installationId);
            if (!choice) throw new StorageError(403, 'This GitHub installation was not authorized for this connection');
            this.db.query(`INSERT INTO github_connections (event_id,installation_id,account,account_type,app_id) VALUES (?,?,?,?,?)
                ON CONFLICT(event_id) DO UPDATE SET installation_id=excluded.installation_id,account=excluded.account,account_type=excluded.account_type,app_id=excluded.app_id`)
                .run(flow.event_id, choice.id, choice.account, choice.type, String(appId));
            this.db.query('DELETE FROM github_oauth_flows WHERE id=?').run(selectionId);
            this.touch(flow.event_id);
            return flow.event;
        })();
    }

    disconnectGitHub(sessionId, name) {
        const eventId = this.authorize(sessionId, name);
        this.db.query('DELETE FROM github_connections WHERE event_id=?').run(eventId);
        this.touch(eventId);
    }

    addMentor(sessionId, name, input) {
        const eventId = this.authorize(sessionId, name);
        const mentorName = text(input.name, 'mentor name', 80, true).trim();
        return this.db.transaction(() => {
            if (this.db.query('SELECT 1 FROM mentors WHERE event_id = ? AND name = ?').get(eventId, mentorName)) {
                throw new StorageError(400, 'A mentor with that name already exists');
            }
            const mentor = { id: randomUUID(), name: mentorName };
            this.db.query('INSERT INTO mentors (id, event_id, name) VALUES (?, ?, ?)').run(mentor.id, eventId, mentor.name);
            this.touch(eventId);
            return mentor;
        })();
    }

    validateCreator(eventId, creatorId) {
        if (creatorId && !this.db.query('SELECT 1 FROM mentors WHERE id = ? AND event_id = ?').get(creatorId, eventId)) {
            throw new StorageError(400, 'Creator must be a mentor in this event');
        }
    }

    findTeam(eventId, input) {
        const team = typeof input.teamId === 'string'
            ? this.db.query('SELECT * FROM teams WHERE id = ? AND event_id = ?').get(input.teamId, eventId)
            : this.db.query('SELECT * FROM teams WHERE name = ? AND event_id = ?').get(text(input.oldName ?? input.teamName, 'team name', 200, true), eventId);
        if (!team) throw new StorageError(404, 'Team not found');
        return team;
    }

    queueHelpNotification(eventId, teamId, note, author = '') {
        if (note.type !== 'help_request' || !note.inKanban ||
            !this.db.query('SELECT 1 FROM discord_settings WHERE event_id=? AND enabled=1').get(eventId)) return;
        if (this.db.query('SELECT COUNT(*) n FROM discord_notifications WHERE event_id=?').get(eventId).n >= 5000) return;
        // No note FK: whole-team saves replace note rows. Keep the delivery marker
        // through those saves so editing a request can never announce it again.
        this.db.query('INSERT OR IGNORE INTO discord_notifications(note_id,event_id,team_id,author,created_at,next_attempt_at) VALUES(?,?,?,?,?,?)')
            .run(note.id,eventId,teamId,author.slice(0,100),this.now(),this.now());
    }

    editTeam(sessionId, name, input) {
        const eventId = this.authorize(sessionId, name);
        let notes;
        if (input.stickyNotes !== undefined) {
            if (!Array.isArray(input.stickyNotes) || input.stickyNotes.length > 1000) throw new StorageError(400, 'Invalid notes');
            notes = input.stickyNotes.map(noteFields);
            if (new Set(notes.map(note => note.id)).size !== notes.length) throw new StorageError(400, 'Duplicate note IDs');
        }
        return this.db.transaction(() => {
            const team = this.findTeam(eventId, input);
            const fields = teamFields({ ...input,
                teamOriginality: input.teamOriginality === undefined ? team.originality : input.teamOriginality,
                teamProjectAbstract: input.teamProjectAbstract === undefined ? JSON.parse(team.project_abstract) : input.teamProjectAbstract });
            if (!Number.isInteger(input.revision) || input.revision !== team.revision) {
                throw new StorageError(409, 'Team changed. Reload before saving again.');
            }
            if (this.db.query('SELECT 1 FROM teams WHERE event_id = ? AND name = ? AND id != ?').get(eventId, fields.name, team.id)) {
                throw new StorageError(400, 'Team name already exists');
            }
            // Validate all cross-team IDs before touching either rows or the existing notes.
            if (notes) for (const note of notes) {
                this.validateCreator(eventId, note.creatorId);
                const owner = this.db.query('SELECT team_id FROM notes WHERE id = ?').get(note.id);
                if (owner && owner.team_id !== team.id) throw new StorageError(400, 'Note ID belongs to another team');
            }
            this.db.query('UPDATE teams SET name = ?, color = ?, github = ?, description = ?, originality = ?, project_abstract = ?, revision = revision + 1 WHERE id = ?')
                .run(fields.name, fields.color, fields.github, fields.description, fields.originality, JSON.stringify(fields.projectAbstract), team.id);
            if (notes) {
                const oldIds = new Set(this.db.query('SELECT id FROM notes WHERE team_id=?').all(team.id).map(note=>note.id));
                this.db.query('DELETE FROM notes WHERE team_id = ?').run(team.id);
                const insert = this.db.query('INSERT INTO notes (id, team_id, content, color, priority, status, position, type, creator_id, in_kanban) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                notes.forEach((note, position) => insert.run(note.id, team.id, note.content, note.color, note.priority, note.status, position, note.type, note.creatorId, Number(note.inKanban)));
                for (const note of notes) if (!oldIds.has(note.id)) this.queueHelpNotification(eventId,team.id,note);
            }
            this.touch(eventId);
            return team.revision + 1;
        })();
    }

    editStartupMatrix(sessionId, name, input) {
        const eventId = this.authorize(sessionId, name);
        text(input.teamId, 'team ID', 100, true);
        const patch = matrixAnswers(input.answers);
        return this.db.transaction(() => {
            const team = this.findTeam(eventId, input);
            if (!Number.isInteger(input.revision) || input.revision !== team.revision) {
                throw new StorageError(409, 'Tým mezitím někdo změnil. Vaše rozepsané odpovědi zůstaly zachované; před dalším uložením načtěte aktuální data.');
            }
            const mentorId = input.mentorId === undefined ? team.matrix_mentor_id : input.mentorId;
            if (mentorId !== null) text(mentorId, 'mentor ID', 100, true);
            this.validateCreator(eventId, mentorId);
            const startupMatrix = { ...JSON.parse(team.startup_matrix), ...patch };
            this.db.query('UPDATE teams SET startup_matrix = ?, matrix_mentor_id = ?, revision = revision + 1 WHERE id = ?')
                .run(JSON.stringify(startupMatrix), mentorId, team.id);
            this.touch(eventId);
            return { startupMatrix, matrixMentorId: mentorId, revision: team.revision + 1 };
        })();
    }

    editNote(sessionId, name, input) {
        return this.changeNote(sessionId, name, input, false);
    }

    deleteNote(sessionId, name, input) {
        return this.changeNote(sessionId, name, input, true);
    }

    changeNote(sessionId, name, input, remove) {
        const eventId = this.authorize(sessionId, name);
        text(input.teamId, 'team ID', 100, true);
        text(input.noteId, 'note ID', 100, true);
        return this.db.transaction(() => {
            const team = this.findTeam(eventId, input);
            const existing = this.db.query('SELECT * FROM notes WHERE id = ? AND team_id = ?').get(input.noteId, team.id);
            if (!existing) throw new StorageError(404, 'Note not found');
            if (!Number.isInteger(input.revision) || input.revision !== team.revision) {
                throw new StorageError(409, 'Team changed. Reload before saving again.');
            }
            let note;
            if (remove) {
                this.db.query('DELETE FROM notes WHERE id = ? AND team_id = ?').run(existing.id, team.id);
            } else {
                const patch = input.patch;
                const fields = ['content', 'color', 'priority', 'status', 'type', 'creatorId', 'inKanban'];
                if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length ||
                    Object.keys(patch).some(key => !fields.includes(key))) throw new StorageError(400, 'Invalid note update');
                if ('status' in patch && !NOTE_STATUSES.includes(patch.status)) throw new StorageError(400, 'Invalid note status');
                note = noteFields({ ...existing, creatorId: existing.creator_id, inKanban: !!existing.in_kanban, ...patch });
                this.validateCreator(eventId, note.creatorId);
                this.db.query('UPDATE notes SET content = ?, color = ?, priority = ?, status = ?, type = ?, creator_id = ?, in_kanban = ? WHERE id = ? AND team_id = ?')
                    .run(note.content, note.color, note.priority, note.status, note.type, note.creatorId, Number(note.inKanban), note.id, team.id);
            }
            this.db.query('UPDATE teams SET revision = revision + 1 WHERE id = ?').run(team.id);
            this.touch(eventId);
            return { revision: team.revision + 1, ...(note ? { note: { ...note, _id: note.id } } : {}) };
        })();
    }

    deleteTeam(sessionId, name, input) {
        const eventId = this.authorize(sessionId, name);
        this.db.transaction(() => {
            const team = this.findTeam(eventId, input);
            this.db.query('DELETE FROM teams WHERE id = ?').run(team.id);
            this.touch(eventId);
        })();
    }

    touch(id) { this.db.query('UPDATE events SET updated_at = ? WHERE id = ?').run(this.timestamp(), id); }
}

export function publicEvent(data) {
    const { password: _password, githubToken } = data.settings;
    return { ...data, settings: { githubToken: githubToken ? 'x'.repeat(githubToken.length) : false, githubApp: !!data.settings.githubApp } };
}
