export function useGithubSeries(eventName) {
    const cache = useState(`githubSeries:${eventName}`, () => ({}));

    async function getSeries(repoUrl) {
        if (cache.value[repoUrl]?.nextCheckAt && Date.parse(cache.value[repoUrl].nextCheckAt)>Date.now() && !cache.value[repoUrl].stale) {
            return cache.value[repoUrl];
        }
        const res = await $fetch(`/api/github/series?url=${encodeURIComponent(repoUrl)}&event=${encodeURIComponent(eventName)}`);
        if (res.status === 200) {
            cache.value[repoUrl] = res;
        }
        return res;
    }

    return { getSeries, cache };
}
