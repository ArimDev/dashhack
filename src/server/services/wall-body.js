import { StorageError } from '../storage/sqlite.js';

const closing = Symbol('wallBodyClosing');
export function stopWallBody(request, response) {
    if (request[closing]) return;
    request[closing] = true;
    request.pause();
    response.shouldKeepAlive = false;
    response.setHeader?.('Connection', 'close');
    // Let the small JSON error flush before stopping the rest of an oversized/slow body.
    response.once('finish', () => {
        // Bun's Node compatibility layer emits finish before its Web Response flushes.
        const timer = setTimeout(() => request.destroy(), 100);
        timer.unref?.();
    });
}
export function readWallNodeBody(request, response, { limit, timeoutMs = 20000 }) {
    return new Promise((resolve, reject) => {
        const chunks = []; let size = 0, finished = false;
        const complete = error => {
            if (finished) return;
            finished = true; clearTimeout(timer);
            request.removeListener('data', data); request.removeListener('end', end);
            request.removeListener('aborted', aborted); request.removeListener('error', failed);
            if (error) {
                request.once('error', () => {});
                stopWallBody(request, response); reject(error);
            } else resolve(Buffer.concat(chunks, size));
        };
        const data = chunk => {
            size += chunk.length;
            if (size > limit) complete(new StorageError(413, 'Prepared photos must be at most 2 MiB. Use the upload page to resize your photo.'));
            else chunks.push(Buffer.from(chunk));
        };
        const end = () => complete();
        const aborted = () => complete(new StorageError(400, 'Upload was interrupted. Please try again.'));
        const failed = () => complete(new StorageError(400, 'Upload was interrupted. Please try again.'));
        const timer = setTimeout(() => complete(new StorageError(408, 'Upload timed out. Please try again.')), timeoutMs);
        request.on('data', data).once('end', end).once('aborted', aborted).once('error', failed);
        if (request.readableEnded) end();
    });
}
