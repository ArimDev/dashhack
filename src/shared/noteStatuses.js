export const NOTE_PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const NOTE_STATUSES = ['To Do', 'In Progress', 'Done'];

// Legacy/imported custom statuses stay visible until moved to a standard column.
export function noteColumn(status) {
    return NOTE_STATUSES.includes(status) ? status : 'To Do';
}
