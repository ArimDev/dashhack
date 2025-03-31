export default defineEventHandler(async (_event) => {
    const query = getQuery(_event);
    const { url, event } = query;

    return githubSeries(
        decodeURIComponent(url),
        decodeURIComponent(event)
    );
});
