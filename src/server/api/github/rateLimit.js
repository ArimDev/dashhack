export default apiHandler(async event => githubRateLimit(getQuery(event).event));
