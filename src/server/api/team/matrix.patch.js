export default apiHandler(async (event) => {
    const body = await readBody(event);
    const result = getStore().editStartupMatrix(getCookie(event, 'session'), body.username, body);
    return { status: 200, message: 'Startupová matice uložena.', ...result };
});
