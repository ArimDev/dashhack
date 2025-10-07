import { connectDB } from "../../utils/db";
import Event from "../../models/Event";
import Session from "../../models/Session";

export default defineEventHandler(async (_event) => {
    await connectDB();

    const eventName = _event.context.params.event;
    const eventData = await Event.findOne({ event: eventName });

    if (!eventData) {
        return { status: 404, message: "Event not found" };
    }

    let githubToken = false;
    if (eventData.settings.githubToken) githubToken = "x".repeat(eventData.settings.githubToken.length);

    let data = {
        event: eventData.event,
        logo: eventData.logo,
        color: eventData.color,
        teams: [...eventData.teams],
        createdAt: eventData.createdAt,
        updatedAt: eventData.updatedAt,
        settings: {
            githubToken
        }
    };

    return { status: 200, message: "Event found", data };

    /* # SESSION CHECK (LOGIN)
    const sessionID = getCookie(_event, "session");
    if (!sessionID) {
        if (getCookie(_event, "sessionExists")) deleteCookie(_event, "sessionExists", {
            httpOnly: false,
            secure: !import.meta.dev,
            sameSite: "strict",
            path: "/"
        });

        return data;
    } else {
        const session = await Session.findOne({ sessionID });
        if (!session) {
            deleteCookie(_event, "sessionExists", {
                httpOnly: false,
                secure: !import.meta.dev,
                sameSite: "strict",
                path: "/"
            });
            deleteCookie(_event, "session", {
                httpOnly: true,
                secure: !import.meta.dev,
                sameSite: "strict",
                path: "/"
            });

            return data;
        } else {
            return { ...data, settings: eventData.settings };
        }
    }
    */
});
