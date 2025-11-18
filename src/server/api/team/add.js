import { connectDB } from "../../utils/db";
import Event from "../../models/Event";
import Session from "../../models/Session";

export default defineEventHandler(async (event) => {
    if (event.method !== "POST") {
        return { status: 405, message: "Method Not Allowed" };
    }

    await connectDB();

    const cookies = parseCookies(event);
    const sessionId = cookies.session;

    if (!sessionId) {
        return { status: 401, message: "Unauthorized" };
    }

    const session = await Session.findOne({ sessionID: sessionId });

    if (!session) {
        return { status: 401, message: "Session not found or expired" };
    }

    const body = await readBody(event);
    const { username, teamName, teamColor, teamGithub, teamDescription } = body;

    const existingEvent = await Event.findOne({ event: username });

    if (!existingEvent) {
        return { status: 404, message: "Event not found" };
    }

    if (existingEvent.event !== session.username) {
        return { status: 403, message: "Forbidden: You do not have permission to modify this event" };
    }

    existingEvent.teams.push({
        name: teamName,
        color: teamColor,
        github: teamGithub,
        description: teamDescription,
        stickyNotes: [],
    });

    await existingEvent.save();

    return { status: 200, message: "Team added successfully" };
});
