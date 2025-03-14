    import { connectDB } from "../../utils/db";
    import Event from "../../models/Event";

    export default defineEventHandler(async (event) => {
        await connectDB();

        const eventName = event.context.params.event;

        const query = getQuery(event);
        const { password } = query;

        const eventData = await Event.findOne({ event: eventName });

        if (!eventData) {
            return { status: 404, message: "Event not found" };
        }

        if (eventData.settings && !!eventData.settings.needPassword) {
            //TODO: Need password to read
        }

        const returnData = {
            event: eventData.event,
            logo: eventData.logo,
            color: eventData.color,
            settings: eventData.settings ? { ...eventData.settings } : {},
            teams: [...eventData.teams],
            createdAt: eventData.createdAt,
            updatedAt: eventData.updatedAt
        };

        return returnData;
    });
