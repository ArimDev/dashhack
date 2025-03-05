import { defineEventHandler, readBody, setCookie } from "h3";

import bcrypt from "bcrypt";

import Event from "../../models/Event";
import Session from "../../models/Session";

import { connectDB } from "../../utils/db";

import { v4 as uuidv4 } from "uuid";

export default defineEventHandler(async (_event) => {
    await connectDB();

    const { username, password } = await readBody(_event);

    const event = await Event.findOne({ event: username });
    if (!event) return { success: false, message: "Event not found" };

    const passwordMatch = await bcrypt.compare(password, event.password);
    if (!passwordMatch) return { success: false, message: "Wrong password" };

    const sessionID = uuidv4();
    await Session.create({ sessionID, username });

    setCookie(_event, "session", sessionID, {
        httpOnly: true,
        secure: false, //FIX | FALSE FOR LOCALHOST
        sameSite: "strict",
        maxAge: 60 * 60,
        path: "/"
    });

    return { success: true, message: "Logged in" };
});
