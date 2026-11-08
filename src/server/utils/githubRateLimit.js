
export default async function githubRateLimit(event) {
    let token;
    try { token = await githubCredential(event); }
    catch (error) { return { status: error.status || 502, message: error.message }; }

    const url = "https://api.github.com/rate_limit";

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json"
    };

    try {
        const rateData = await $fetch(url, {
            method: "GET",
            headers,
        });

        if (rateData?.rate) return { status: 200, rate: rateData.rate };
        else return { status: 502, rate: rateData?.rate || { remaining: 0 } };
    } catch (error) {
        return { status: error?.response?.status || 502, message: error?.response?.statusText || "Undefined error" };
    }
}
