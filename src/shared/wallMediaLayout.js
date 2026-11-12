export const WALL_MEDIA_RATIOS = ['original', '1/1', '4/3', '3/4', '16/9', '9/16'];
export const WALL_MEDIA_DEFAULT = Object.freeze({ ratio: 'original', focusX: 50, focusY: 50, span: 1 });
export function validateWallMediaLayout(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['ratio', 'focusX', 'focusY', 'span'].includes(key))) throw new Error('Invalid photo framing');
    if (!WALL_MEDIA_RATIOS.includes(value.ratio) || ![value.focusX, value.focusY].every(n => Number.isInteger(n) && n >= 0 && n <= 100)) throw new Error('Invalid photo framing');
    if (value.span !== undefined && ![1, 2].includes(value.span)) throw new Error('Invalid tile width');
    return { ratio: value.ratio, focusX: value.focusX, focusY: value.focusY, ...(value.span === undefined ? {} : { span: value.span }) };
}
export function wallMediaStyle(layout = WALL_MEDIA_DEFAULT) {
    return layout.ratio === 'original' ? {} : { aspectRatio: layout.ratio, objectFit: 'cover', objectPosition: `${layout.focusX}% ${layout.focusY}%` };
}
