// Read-only deployment check; includes SQLite/WAL/backups in actual free-space usage.
import { Database } from 'bun:sqlite';
import { statfsSync, statSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { WALL_MEDIA_BUDGET, EVENT_MEDIA_BUDGET, VOLUME_RESERVE } from '../src/shared/wallUploads.js';
const filename = resolve(process.env.NUXT_SQLITE_PATH || './.data/dashhack.sqlite');
const folder = dirname(filename), fs = statfsSync(folder), available = fs.bavail * fs.bsize;
const db = new Database(filename, { readonly: true });
try {
    const bytes = db.query('SELECT COALESCE(SUM(length(data)),0) AS n FROM wall_media').get().n;
    const files = [filename, filename + '-wal', filename + '-shm'].map(path => ({ name: path.split('/').pop(), bytes: existsSync(path) ? statSync(path).size : 0 }));
    const backups = join(folder, 'backups');
    const backupBytes = existsSync(backups) ? readdirSync(backups).reduce((sum, name) => sum + (statSync(join(backups, name)).isFile() ? statSync(join(backups, name)).size : 0), 0) : 0;
    console.log(JSON.stringify({ availableBytes: available, capacityBytes: fs.blocks * fs.bsize, reserveBytes: VOLUME_RESERVE,
        mediaBytes: bytes, mediaLimit: WALL_MEDIA_BUDGET, perEventMediaLimit: EVENT_MEDIA_BUDGET, files, backupBytes,
        uploadsPaused: available < VOLUME_RESERVE || bytes >= WALL_MEDIA_BUDGET }));
} finally { db.close(); }
