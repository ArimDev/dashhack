export default async function githubSeries(_url, token) {
    let reqs = 0;

    async function getRequest(url, headers) {
        const options = {
            method: "GET",
            headers
        };

        try {
            const response = await $fetch(url, options);
            reqs++;
            return response;
        } catch (error) {
            return { status: 500, message: "Something went wrong with GitHub API!", reqs };
        }
    }

    const matchURL = _url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!matchURL) return { status: 400, message: "Invalid GitHub repository URL.", reqs };
    const owner = matchURL[1], repo = matchURL[2];

    const url = `https://api.github.com/repos/${owner}/${repo}/commits`;

    const headers = {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github+json"
    };

    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000); // 24 hours in ms

    // 24 element array with objects ready
    const hourlyStats = Array.from({ length: 24 }, () => ({ commits: 0, lines: 0 }));

    try {
        const commitsData = await getRequest(url, headers);

        if (!Array.isArray(commitsData)) {
            return { status: 500, message: "Invalid response from GitHub API", reqs };
        }

        for (const commit of commitsData) {
            const commitTime = new Date(commit.commit.committer.date);
            if (commitTime >= last24Hours) {
                const hour = commitTime.getHours();
                hourlyStats[hour].commits++;

                const sha = commit.sha;
                const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
                const commitDetails = await getRequest(commitUrl, headers);

                if (commitDetails.files) {
                    commitDetails.files.forEach(file => {
                        if (file.changes) {
                            hourlyStats[hour].lines += file.changes;
                        }
                    });
                }
            }
        }

        const commits = hourlyStats.map(item => item.commits);
        const diff = hourlyStats.map(item => item.lines);
        return { status: 200, commits, diff, reqs };
    } catch (error) {
        console.error("Error occurred:", error);
        return { status: 500, message: "Something went wrong!", reqs };
    }
}
