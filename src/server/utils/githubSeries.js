import { parseGitHubRepository } from "../services/github-app.js";

export default async function githubSeries(_url, event) {
    let repository, token;
    try {
        repository = parseGitHubRepository(_url);
        token = await githubCredential(event, repository);
    } catch (error) { return { status: error.status || 502, message: error.message, reqs: 0 }; }

    let reqs = 0;

    async function getRequest(url, headers) {
        const options = {
            method: "GET",
            headers
        };

        try {
            const response = await $fetch(url, options)
            reqs++;
            return response;
        } catch (error) {
            return { status: 500, message: error?.response?._data?.message || error.message || "GitHub request failed", reqs };
        }
    }

    const [owner, repo] = repository.split('/');

    const url = `https://api.github.com/repos/${owner}/${repo}/commits`;

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json"
    };

    const now = new Date();
    now.setMinutes(0, 0, 0); //Rounding down (15:30 -> 15:00)

    //Custom array with 24 buckets for the last 24 hours
    const buckets = Array.from({ length: 24 }, (_, i) => ({
        from: new Date(now.getTime() - i * 60 * 60 * 1000),
        to: new Date(now.getTime() - (i - 1) * 60 * 60 * 1000),
        commits: 0,
        lines: 0,
    }));

    try {
        const commitsData = await getRequest(url, headers);

        if (commitsData.status && commitsData.status !== 200 || !Array.isArray(commitsData)) {
            return { status: commitsData.status, message: commitsData.message, reqs };
        }

        for (const commit of commitsData) {
            const commitTime = new Date(commit.commit.committer.date);

            for (let i = 0; i < 24; i++) {
                if (commitTime >= buckets[i].from && commitTime < buckets[i].to) {
                    buckets[i].commits++;
                    const sha = commit.sha;
                    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;

                    const commitDetails = await getRequest(commitUrl, headers);
                    if (commitDetails.files) {
                        commitDetails.files.forEach(file => {
                            if (file.changes) {
                                buckets[i].lines += file.changes;
                            }
                        });
                    }
                    break;
                }
            }
        }

        //Index 0 is the most recent hour, index 23 is the oldest
        const commits = buckets.map(b => b.commits);
        const diff = buckets.map(b => b.lines);

        //Hours in format HH:00 for chart
        const hours = buckets.map(b => {
            const h = b.from.getHours();
            return `${h.toString().padStart(2, "0")}:00`;
        });

        return { status: 200, commits, diff, hours, reqs };
    } catch (error) {
        console.error("Error occurred:", error);
        return { status: 500, message: "Something went wrong!", reqs };
    }
}
