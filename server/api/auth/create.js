import { connectDB } from "../../utils/db";
import Event from "../../models/Event";

export default defineEventHandler(async (event) => {
	await connectDB();

	const body = await readBody(event);
	const { username, password } = body;

	const existingUser = await Event.findOne({ event: username });
	if (existingUser) {
		return { status: 400, statusMessage: "Username already exists" };
	}

	const newEvent = new Event({ event: username, settings: { password } });
	await newEvent.save();

	return { status: 200, message: "Event registered successfully" };
});
