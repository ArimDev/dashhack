export default apiHandler((event) => {
    getStore().deleteSession(getCookie(event, 'session'));
    clearSessionCookies(event);
    return { status: 200, message: 'Logged out' };
});
