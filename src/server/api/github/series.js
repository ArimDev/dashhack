export default apiHandler(async event => {
    const query = getQuery(event);
    return githubSeries(query.url, query.event);
});
