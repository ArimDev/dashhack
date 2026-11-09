import { MAX_PHOTO_SOURCE_BYTES, MAX_STORED_PHOTO_BYTES, PHOTO_EDGE } from '../../shared/wallUploads.js';

export async function prepareWallPhoto(file) {
    const photo = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
    if (!photo) throw new Error('Choose a photo. Video uploads are not supported.');
    if (file.size > MAX_PHOTO_SOURCE_BYTES) throw new Error('Photos must be at most 25 MiB. Choose a smaller photo.');
    const source = URL.createObjectURL(file), image = new Image();
    const canvas = document.createElement('canvas');
    try {
        image.src = source;
        await image.decode();
        if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 64_000_000) throw new Error('Image dimensions are too large.');
        for (const edge of [PHOTO_EDGE, 1280]) {
            const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            for (const quality of [0.8, 0.65, 0.5]) {
                let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
                // Older Safari can decode WebP without offering WebP canvas encoding.
                if (blob?.type !== 'image/webp') blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
                if (blob && blob.size <= MAX_STORED_PHOTO_BYTES) {
                    return new File([blob], blob.type === 'image/webp' ? 'moment.webp' : 'moment.jpg', { type: blob.type });
                }
            }
        }
        throw new Error('Photo is still too large.');
    } catch {
        throw new Error('This photo could not be prepared. Try a smaller JPEG/PNG from Photo Library, or a screenshot.');
    } finally { URL.revokeObjectURL(source); image.src = ''; canvas.width = canvas.height = 0; }
}
