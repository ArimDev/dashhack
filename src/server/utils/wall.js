import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { WallStore } from '../storage/wall.js';
import { MAX_UPLOAD_BYTES } from '../../shared/wallUploads.js';
import { StorageError } from '../storage/sqlite.js';
import { WallUploadGate } from '../services/wall-upload-gate.js';
import { readWallNodeBody, stopWallBody } from '../services/wall-body.js';

export function getWallStore() { return new WallStore(getStore()); }
const uploads = new WallUploadGate();
export function checkWallUploadRate(event) {
    const origin = getHeader(event, 'origin');
    if (getHeader(event, 'sec-fetch-site') === 'cross-site' || (origin && (() => {
        try { return new URL(origin).host !== getHeader(event, 'host'); } catch { return true; }
    })())) throw new StorageError(403, 'Submit from this event’s upload page.');
    let client = getCookie(event, 'wallUploader');
    if (!/^[a-f\d-]{36}$/.test(client || '')) {
        client = randomUUID();
        setCookie(event, 'wallUploader', client, { httpOnly: true, secure: !import.meta.dev, sameSite: 'strict', path: '/', maxAge: 86400 });
    }
    // Railway's edge supplies X-Real-IP. Do not trust arbitrary forwarded chains.
    const edgeIP = process.env.RAILWAY_ENVIRONMENT_ID && getHeader(event, 'x-real-ip');
    const network = edgeIP && isIP(edgeIP) ? edgeIP : getRequestIP(event) || 'unknown';
    try { return uploads.enter(client, network); }
    catch (error) { if (error.status === 429) setHeader(event, 'Retry-After', '60'); throw error; }
}
export async function readWallSubmission(event, { editing = false } = {}) {
    const max = MAX_UPLOAD_BYTES + 32768;
    const multipart = (getHeader(event, 'content-type') || '').startsWith('multipart/form-data');
    const json = (getHeader(event, 'content-type') || '').startsWith('application/json');
    if (!multipart && !json) throw new StorageError(400, 'Use a JSON or upload form submission');
    const limit = multipart ? max : 32768;
    if (Number(getHeader(event, 'content-length')) > limit) {
        stopWallBody(event.node.req, event.node.res);
        throw new StorageError(413, 'Prepared photos must be at most 2 MiB. Use the upload page to resize your photo.');
    }
    const body = await readWallNodeBody(event.node.req, event.node.res, { limit });
    let input = {}, media = null;
    if (multipart) {
        let form;
        try { form = await new Response(body, { headers: { 'content-type': getHeader(event, 'content-type') } }).formData(); }
        catch { throw new StorageError(400, 'Invalid upload form'); }
        for (const [key, value] of form) {
            if (typeof value === 'string') {
                if (editing && key === 'metadata') {
                    if (Object.keys(input).length || value.length > 65536) throw new StorageError(400, 'Invalid post edit');
                    try { input = JSON.parse(value); } catch { throw new StorageError(400, 'Invalid post edit'); }
                    if (!input || typeof input !== 'object' || Array.isArray(input) || input.action !== 'edit') throw new StorageError(400, 'Invalid post edit');
                    continue;
                }
                if (editing) throw new StorageError(400, 'Invalid post edit field');
                if (!['authorName', 'text'].includes(key) || Object.hasOwn(input, key) || value.length > 5000) throw new StorageError(400, 'Invalid wall field');
                input[key] = value;
            } else {
                if (key !== 'file' || media) throw new StorageError(400, 'Submit one photo at a time');
                media = { mime: value.type, data: Buffer.from(await value.arrayBuffer()) };
            }
        }
    } else {
        try { input = JSON.parse(body.toString()); } catch { throw new StorageError(400, 'Invalid JSON submission'); }
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['text', 'authorName'].includes(k))) {
            throw new StorageError(400, 'Invalid wall field');
        }
    }
    return { input, media };
}
