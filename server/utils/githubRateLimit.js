import { connectDB } from "./db";
import Event from "../models/Event";

export default async function githubRateLimit(event) {
    await connectDB();

    const data = await Event.findOne({ event });
    if (!data || !data.settings.githubToken) {
        return { status: 401, message: `Missing GitHub token! (event ${event})` };
    }
    const token = data.settings.githubToken;

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
