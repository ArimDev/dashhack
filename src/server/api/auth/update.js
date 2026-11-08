export default apiHandler(async (event) => {
    const { username, setting, value, oldPassword } = await readBody(event);
    const newSession = await getStore().updateSetting(getCookie(event, 'session'), username, setting, value, oldPassword);
    if (newSession) setSessionCookies(event, newSession);
    return { status: 200, message: 'Setting changed successfully' };
});
