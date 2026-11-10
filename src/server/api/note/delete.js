import {queueMentorDelivery} from '../../utils/mentorNotifications.js';
export default apiHandler(async (event) => {
    if (event.method !== 'DELETE') return { status: 405, message: 'Method Not Allowed' };
    const body = await readBody(event);
    const result = getStore().deleteNote(getCookie(event, 'session'), body.username, body);
    queueMentorDelivery(event);
    return { status: 200, message: 'Note deleted', ...result };
});
