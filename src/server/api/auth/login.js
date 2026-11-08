export default apiHandler(async (event) => {
    const { username, password } = await readBody(event);
    const store = getStore();
    const data = await store.checkPassword(username, password);
    setSessionCookies(event, store.createSession(data._id));
    return { status: 200, message: 'Logged in' };
});
