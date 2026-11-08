import { readFileSync } from 'node:fs';
import { SqliteStore } from '../src/server/storage/sqlite.js';
import { importMongoEvents } from '../src/server/storage/import.js';

const source = process.argv[2];
if (!source) throw new Error('Usage: bun run db:import /private/path/events.json');
const store = new SqliteStore(process.env.NUXT_SQLITE_PATH || './.data/dashhack.sqlite');
try {
    const result = importMongoEvents(store, JSON.parse(readFileSync(source, 'utf8')));
    console.log('Imported:', result, '(sessions intentionally excluded)');
} finally { store.close(); }
