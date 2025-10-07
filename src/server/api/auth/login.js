import { setCookie } from "h3";
import { connectDB } from "../../utils/db";
import Event from "../../models/Event";
import Session from "../../models/Session";

import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export default defineEventHandler(async (_event) => {
    await connectDB();

    const { username, password } = await readBody(_event);

    const event = await Event.findOne({ event: username });
    if (!event) return { status: 404, message: "Event not found" };

    const passwordMatch = await bcrypt.compare(password, event.settings.password);
    if (!passwordMatch) return { status: 401, message: "Wrong password" };

    const sessionID = uuidv4();
    await Session.create({ sessionID, username });

    setCookie(_event, "session", sessionID, {
        httpOnly: true,
        secure: !import.meta.dev,
        sameSite: "strict",
        maxAge: 60 * 60,
        path: "/"
    });

    setCookie(_event, "sessionExists", true, {
        httpOnly: false,
        secure: !import.meta.dev,
        sameSite: "strict",
        maxAge: 60 * 60,
        path: "/"
    });

    return { status: 200, message: "Logged in" };
});
