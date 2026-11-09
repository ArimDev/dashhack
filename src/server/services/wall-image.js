import sharp from 'sharp';
import { StorageError } from '../storage/sqlite.js';
import { validateMedia } from '../storage/wall.js';
import { MAX_STORED_PHOTO_BYTES, PHOTO_EDGE } from '../../shared/wallUploads.js';

// One public request is admitted at a time. Keep the native decoder bounded too.
sharp.cache(false);
sharp.concurrency(1);
export async function normalizeWallMedia(media) {
    if (!media) return null;
    validateMedia(media.data, media.mime);
    try {
        const data = await sharp(media.data, { limitInputPixels: 4_000_000, pages: 1, failOn: 'warning' })
            .rotate().resize({ width: PHOTO_EDGE, height: PHOTO_EDGE, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 78, effort: 2 }).timeout({ seconds: 8 }).toBuffer();
        if (data.length > MAX_STORED_PHOTO_BYTES) throw new StorageError(413, 'Photo is still too large. Choose a smaller photo.');
        // Metadata is stripped by default; animated photos become a still first frame.
        return { mime: 'image/webp', data };
    } catch (error) {
        if (error instanceof StorageError) throw error;
        throw new StorageError(415, 'This photo could not be processed. Choose a JPEG, PNG or WebP photo from your Photo Library.');
    }
}
