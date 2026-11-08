export default apiHandler(async (event) => {
    const body = await readBody(event);
    const mentor = getStore().addMentor(getCookie(event, 'session'), body.username, body);
    return { status: 200, message: 'Mentor added', mentor };
});
