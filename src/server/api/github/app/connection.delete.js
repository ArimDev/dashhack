export default apiHandler(async event => {
    const { event: name } = await readBody(event);
    getStore().disconnectGitHub(getCookie(event, 'session'), name);
    return { status: 200 };
});
