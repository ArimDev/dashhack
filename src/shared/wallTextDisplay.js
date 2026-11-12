export function wallTextDisplay(post) {
    return { enabled: post.textDisplay?.enabled ?? !(post.platform === 'manual' && post.pinned), limit: post.textDisplay?.limit ?? 100 };
}
export function validateWallTextDisplay(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['enabled', 'limit'].includes(key)) || typeof value.enabled !== 'boolean' || !Number.isInteger(value.limit) || value.limit < 1 || value.limit > 5000) throw new Error('Invalid article preview (limit 1–5000 characters)');
    return { enabled: value.enabled, limit: value.limit };
}
