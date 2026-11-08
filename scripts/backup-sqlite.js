import { Database } from 'bun:sqlite';
import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = process.env.NUXT_SQLITE_PATH || './.data/dashhack.sqlite';
const target = process.argv[2];
if (!target || resolve(source) === resolve(target) || existsSync(target)) {
    throw new Error('Usage: bun run db:backup /path/to/new-snapshot.sqlite (destination must not exist)');
}
mkdirSync(dirname(resolve(target)), { recursive: true });
const db = new Database(source, { readonly: true });
try {
    // VACUUM INTO creates a consistent snapshot including committed WAL contents.
    db.query('VACUUM INTO ?').run(resolve(target));
    chmodSync(target, 0o600);
    console.log('SQLite snapshot created. Store a copy outside the application volume.');
} finally { db.close(); }
