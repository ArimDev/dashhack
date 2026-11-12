// Structured text only: render runs through Vue interpolation, never as HTML.
export function wallTextBlocks(text = '') {
    return text.split('\n').map(text => ({ type: 'paragraph', runs: [{ text, bold: false, italic: false }] }));
}
export function wallTextPlain(blocks) {
    return blocks.map(block => block.runs.map(run => run.text).join('')).join('\n');
}
export function wallTextPreview(blocks, limit) {
    let remaining = limit;
    const preview = [];
    for (const block of blocks) {
        if (remaining <= 0) break;
        const runs = [];
        for (const run of block.runs) {
            if (remaining <= 0) break;
            runs.push({ ...run, text: run.text.slice(0, remaining) });
            remaining -= run.text.length;
        }
        preview.push({ ...block, runs }); remaining--;
    }
    if (wallTextPlain(blocks).length > limit && preview.length) preview.at(-1).runs.push({ text: '…' });
    return preview;
}
export function validateWallText(blocks) {
    if (!Array.isArray(blocks) || blocks.length > 200) throw new Error('Invalid post formatting');
    let count = 0;
    const result = blocks.map(block => {
        if (!block || !['paragraph', 'bullet'].includes(block.type) || !Array.isArray(block.runs)) throw new Error('Invalid post formatting');
        return { type: block.type, runs: block.runs.map(run => {
            if (!run || typeof run.text !== 'string' || ++count > 2000 ||
                (run.bold !== undefined && typeof run.bold !== 'boolean') ||
                (run.italic !== undefined && typeof run.italic !== 'boolean')) throw new Error('Invalid post formatting');
            return { text: run.text, bold: !!run.bold, italic: !!run.italic };
        }) };
    });
    if (wallTextPlain(result).length > 5000) throw new Error('Post text must be at most 5000 characters');
    return result;
}
