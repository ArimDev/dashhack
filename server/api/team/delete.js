import { connectDB } from "../../utils/db";
import Event from "../../models/Event";
import Session from "../../models/Session";

export default defineEventHandler(async (event) => {
    if (event.method !== "DELETE") {
        throw createError({ status: 405, statusMessage: "Method Not Allowed" });
    }

    await connectDB();

    const cookies = parseCookies(event);
    const sessionId = cookies.session;

    if (!sessionId) {
        throw createError({ status: 401, statusMessage: "Unauthorized" });
    }

    const session = await Session.findOne({ sessionID: sessionId });

    if (!session) {
        throw createError({ status: 401, statusMessage: "Session not found or expired" });
    }

    const body = await readBody(event);
    const { username, teamName } = body;

    const existingEvent = await Event.findOne({ event: username });

    if (!existingEvent) {
        throw createError({ status: 404, statusMessage: "Event not found" });
    }

    if (existingEvent.event !== session.username) {
        throw createError({ status: 403, statusMessage: "Forbidden: You do not have permission to modify this event" });
    }

    const teamIndex = existingEvent.teams.findIndex(team => team.name === teamName);

    if (teamIndex === -1) {
        throw createError({ status: 404, statusMessage: "Team not found" });
    }

    existingEvent.teams.splice(teamIndex, 1);

    await existingEvent.save();

    return { status: 200, message: "Team deleted successfully" };
});
