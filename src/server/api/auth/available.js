export default apiHandler((event) => {
    const exists = getStore().exists(getQuery(event).username);
    return { status: exists ? 200 : 404, exists };
});
