export default apiHandler(async (event) => {
    if (event.method !== 'DELETE') return { status: 405, message: 'Method Not Allowed' };
    const body = await readBody(event);
    getStore().deleteTeam(getCookie(event, 'session'), body.username, body);
    return { status: 200, message: 'Team deleted successfully' };
});
