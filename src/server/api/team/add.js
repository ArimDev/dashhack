export default apiHandler(async (event) => {
    if (event.method !== 'POST') return { status: 405, message: 'Method Not Allowed' };
    const body = await readBody(event);
    const teamId = getStore().addTeam(getCookie(event, 'session'), body.username, body);
    return { status: 200, message: 'Team added successfully', teamId };
});
