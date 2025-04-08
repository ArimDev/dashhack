import bcrypt from "bcrypt";

import Event from "../../models/Event";

import { connectDB } from "../../utils/db";

export default defineEventHandler(async (_event) => {
    await connectDB();

    const { username, password } = await readBody(_event);

    const event = await Event.findOne({ event: username });
    if (!event) return { status: 404, message: "Event not found" };

    const passwordMatch = await bcrypt.compare(password, event.settings.password);
    if (!passwordMatch) return { status: 401, message: "Wrong password" };
    else return { status: 200, message: "Password is correct!" };
});
