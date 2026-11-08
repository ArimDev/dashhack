export default apiHandler(async (event) => {
    const { username, password } = await readBody(event);
    await getStore().createEvent(username, password);
    return { status: 200, message: 'Event registered successfully' };
});
