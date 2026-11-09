import { createHash } from 'node:crypto';
import { StorageError } from '../storage/sqlite.js';

export class WallUploadGate {
    constructor({ now = Date.now } = {}) { this.now = now; this.buckets = new Map(); this.active = false; }
    enter(client, network) {
        const now = this.now();
        for (const [key, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(key);
        // Network cap accommodates students sharing school Wi-Fi. Cookie rotation cannot bypass it.
        for (const [raw, limit] of [['all', 90], [`network:${network}`, 60], [`client:${client}`, 5]]) {
            const key = createHash('sha256').update(raw).digest('hex');
            const bucket = this.buckets.get(key) || { count: 0, until: now + 60000 };
            if (bucket.count >= limit || (!this.buckets.has(key) && this.buckets.size >= 1024)) {
                throw new StorageError(429, 'Too many submissions. Wait a minute and try again.');
            }
            bucket.count++; this.buckets.set(key, bucket);
        }
        if (this.active) throw new StorageError(429, 'Another upload is being processed. Try again in a few seconds.');
        this.active = true;
        let released = false;
        return () => { if (!released) { released = true; this.active = false; } };
    }
}
