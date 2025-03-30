export default async function githubRateLimit(token) {
    const url = "https://api.github.com/rate_limit";

    const headers = {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github+json"
    };

    const response = await $fetch(url, {
        method: "GET",
        headers
    });

    return { status: 200, rate: response.rate };
}
