import { SqliteStore } from '../storage/sqlite.js';

let store;
export function getStore() {
    if (!store) store = new SqliteStore(useRuntimeConfig().sqlitePath);
    return store;
}
