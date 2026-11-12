export function wallTextLinks(text, platform = 'x') {
    const tokens = [], pattern = /https?:\/\/[^\s<>]+|(?<![\p{L}\p{N}_])#[\p{L}\p{M}\p{N}_]+/gu;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
        const start = match.index;
        if (start > cursor) tokens.push({ text: text.slice(cursor, start) });
        let label = match[0], href;
        if (label.startsWith('#')) {
            href = platform === 'instagram'
                ? `https://www.instagram.com/explore/tags/${encodeURIComponent(label.slice(1))}/`
                : `https://x.com/hashtag/${encodeURIComponent(label.slice(1))}`;
        } else {
            label = label.replace(/[.,!?;:)\]}]+$/u, '');
            try {
                const url = new URL(label);
                if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) href = url.href;
            } catch {}
        }
        tokens.push({ text: label, ...(href ? { href } : {}) });
        cursor = start + label.length;
    }
    if (cursor < text.length) tokens.push({ text: text.slice(cursor) });
    return tokens;
}
