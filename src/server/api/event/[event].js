import { publicEvent } from '../../storage/sqlite.js';

export default apiHandler((event) => {
    const data = getStore().getEvent(getRouterParam(event, 'event', { decode: true }));
    if (!data) return { status: 404, message: 'Event not found' };
    const session = getStore().getSession(getCookie(event, 'session'));
    return { status: 200, message: 'Event found', data: publicEvent(data), canEdit: session?.eventId === data._id };
});
