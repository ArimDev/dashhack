import { connectDB } from "../../utils/db";
import Event from "../../models/Event";

export default defineEventHandler(async (event) => {
	await connectDB();

	const body = await readBody(event);
	const { username, password } = body;

	const existingUser = await Event.findOne({ event: username });
	if (existingUser) {
		throw createError({ statusCode: 400, statusMessage: "Username already exists" });
	}

	const newEvent = new Event({ event: username, password });
	await newEvent.save();

	return { message: "Event registered successfully", eventID: newEvent._id };
});
