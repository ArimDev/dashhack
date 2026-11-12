export function formatWallTimestamp(value, now = new Date()) {
    const date = new Date(value);
    if (!value || !Number.isFinite(date.getTime())) return '';

    const day = value => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86400000;
    const daysAgo = day(now) - day(date);
    if (daysAgo === 0) return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
    if (daysAgo === 1) return 'Yesterday';
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}