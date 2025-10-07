import { connectDB } from "../../utils/db";
import Event from "../../models/Event";

export default defineEventHandler(async (_event) => {
    if (_event.method !== "GET") {
        return { status: 405, message: "Method Not Allowed" };
    }

    const query = getQuery(_event);
    const { event } = query;

    await connectDB();

    const eventData = await Event.findOne({ event: event });

    if (!eventData) {
        return { status: 404, message: "Event not found" };
    }

    let data = {
        event: eventData.event,
        logo: eventData.logo,
        color: eventData.color,
        teams: [...eventData.teams],
        createdAt: eventData.createdAt,
        updatedAt: eventData.updatedAt
    };

    const json = JSON.stringify(data, null, 4);
    const filename = `dh-${event}-${new Date().toISOString().slice(0, 19)}.json`;

    setHeaders(_event, {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`
    });
    setResponseStatus(_event, 200);
    return json;
});
