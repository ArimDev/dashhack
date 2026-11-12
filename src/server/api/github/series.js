export default apiHandler(async event => {
    setHeader(event,'Cache-Control','no-store');
    const query = getQuery(event);
    return githubSeries(query.url, query.event);
});
