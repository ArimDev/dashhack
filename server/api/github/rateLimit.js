export default defineEventHandler(async (_event) => {
    const query = getQuery(_event);
    const { event } = query;

    return githubRateLimit(decodeURIComponent(event));
});
