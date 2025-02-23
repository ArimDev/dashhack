import { connectDB } from "../../utils/db";
import Event from "../../models/Event";

export default defineEventHandler(async (event) => {
	await connectDB();

	const query = getQuery(event);
	const { username } = query;

	let exists = false;
	if (username) exists = await Event.exists({ event: username });

	return { exists: !!exists };
});
