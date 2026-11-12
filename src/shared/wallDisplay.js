export const WALL_SPEED_PRESETS = Object.freeze([
    { label: 'Slow', value: 20 },
    { label: 'Normal', value: 40 },
    { label: 'Fast', value: 60 },
    { label: 'Very fast', value: 80 },
]);

export const WALL_LAYOUT_FIELDS = Object.freeze([
    { key: 'panelColumns', label: 'Panels across', min: 0, max: 6, default: 0 },
    { key: 'panelGap', label: 'Space between panels (px)', min: 0, max: 32, default: 16 },
    { key: 'panelPadding', label: 'Panel content padding (px)', min: 0, max: 32, default: 16 },
    { key: 'panelRadius', label: 'Panel corner radius (px)', min: 0, max: 32, default: 24 },
    { key: 'panelTextSize', label: 'Post text size (px)', min: 14, max: 32, default: 16 },
]);
export const WALL_LAYOUT_DEFAULTS = Object.freeze(Object.fromEntries(WALL_LAYOUT_FIELDS.map(field => [field.key, field.default])));
