import { connectDB } from "../../utils/db";
import Event from "../../models/Event";
import Session from "../../models/Session";

export default defineEventHandler(async (event) => {
    if (event.method !== "PUT" && event.method !== "POST") {
        return { status: 405, statusMessage: "Method Not Allowed" };
    }

    await connectDB();

    const cookies = parseCookies(event);
    const sessionId = cookies.session;

    if (!sessionId) {
        return { status: 401, statusMessage: "Unauthorized" };
    }

    const session = await Session.findOne({ sessionID: sessionId });

    if (!session) {
        return { status: 401, statusMessage: "Session not found or expired" };
    }

    const body = await readBody(event);
    const { username, oldName, teamName, teamColor, teamDescription, teamGithub } = body;

    const existingEvent = await Event.findOne({ event: username });

    if (!existingEvent) {
        return { status: 404, statusMessage: "Event not found" };
    }

    if (existingEvent.event !== session.username) {
        return { status: 403, statusMessage: "Forbidden: You do not have permission to modify this event" };
    }

    const team = existingEvent.teams.find(t => t.name === oldName);

    if (!team) {
        return { status: 404, statusMessage: "Team not found" };
    }

    team.name = teamName;
    team.color = teamColor;
    team.description = teamDescription;
    team.github = teamGithub;

    await existingEvent.save();

    return { status: 200, message: "Team updated successfully" };
});
