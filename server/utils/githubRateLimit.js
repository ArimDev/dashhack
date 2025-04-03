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
