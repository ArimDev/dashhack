export default apiHandler(async (event) => {
    const { username, password } = await readBody(event);
    await getStore().checkPassword(username, password);
    return { status: 200, message: 'Password is correct!' };
});
