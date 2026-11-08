import { createHash } from 'node:crypto';
import { WallStore, MAX_UPLOAD_BYTES } from '../storage/wall.js';
import { StorageError } from '../storage/sqlite.js';

export function getWallStore() { return new WallStore(getStore()); }
// Bounded process-local throttling for anonymous submissions; no IPs are persisted.
const submissions = new Map();
export function checkWallUploadRate(event) {
    const now = Date.now();
    for (const [key, value] of submissions) if (value.until <= now) submissions.delete(key);
    const ip = getRequestIP(event) || 'unknown';
    const key = createHash('sha256').update(ip).digest('hex');
    const bucket = submissions.get(key) || { count: 0, until: now + 60000 };
    if (bucket.count >= 10 || (!submissions.has(key) && submissions.size >= 256)) throw new StorageError(429,'Please wait a minute before submitting more posts.');
    bucket.count++; submissions.set(key,bucket);
}
export async function readWallSubmission(event) {
    const max = MAX_UPLOAD_BYTES + 32768;
    const contentLength = Number(getHeader(event,'content-length'));
    if (contentLength > max) throw new StorageError(413,'Uploads must be at most 4 MiB');
    const stream = getRequestWebStream(event);
    const reader = stream?.getReader();
    const chunks = []; let size = 0;
    if (reader) try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > max) {
                await reader.cancel();
                throw new StorageError(413,'Uploads must be at most 4 MiB');
            }
            chunks.push(Buffer.from(value));
        }
    } finally { reader.releaseLock(); }
    const body = Buffer.concat(chunks,size);
    const type = getHeader(event,'content-type') || '';
    if (type.startsWith('multipart/form-data')) {
        let form; try { form = await new Response(body,{ headers: { 'content-type': type } }).formData(); }
        catch { throw new StorageError(400,'Invalid upload form'); }
        const input = {}; let media = null;
        for (const [key,value] of form) {
            if (typeof value === 'string') {
                if (value.length > 10000) throw new StorageError(400,'Wall text is too long');
                input[key] = value;
            } else {
                if (key !== 'file' || media) throw new StorageError(400,'Submit one photo or video at a time');
                media = { mime: value.type, data: Buffer.from(await value.arrayBuffer()) };
            }
        }
        return { input, media };
    }
    if (!type.startsWith('application/json') || size > 32768) throw new StorageError(400,'Use a JSON or upload form submission');
    let input; try { input = JSON.parse(body.toString()); } catch { throw new StorageError(400,'Invalid JSON submission'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new StorageError(400,'Invalid post');
    return { input, media: null };
}
