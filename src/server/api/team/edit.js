import {queueMentorDelivery} from '../../utils/mentorNotifications.js';
export default apiHandler(async (event) => {
    if (!['POST', 'PUT'].includes(event.method)) return { status: 405, message: 'Method Not Allowed' };
    const body = await readBody(event);
    const revision = getStore().editTeam(getCookie(event, 'session'), body.username, body);
    queueMentorDelivery(event);
    return { status: 200, message: 'Team updated successfully', revision };
});
