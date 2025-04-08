import { connectDB } from "../../utils/db";
import Event from "../../models/Event";
import Session from "../../models/Session";

import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export default defineEventHandler(async (_event) => {
    await connectDB();

    const sessionID = getCookie(_event, "session");
    let session;
    if (!sessionID) {
        if (getCookie(_event, "sessionExists")) deleteCookie(_event, "sessionExists", {
            httpOnly: false,
            secure: false, // TODO: FIX | FALSE FOR LOCALHOST
            sameSite: "strict",
            path: "/"
        });

        return { status: 401, message: "Not logged in" };
    } else {
        session = await Session.findOne({ sessionID });
        if (!session) {
            deleteCookie(_event, "sessionExists", {
                httpOnly: false,
                secure: false, // TODO: FIX | FALSE FOR LOCALHOST
                sameSite: "strict",
                path: "/"
            });
            deleteCookie(_event, "session", {
                httpOnly: true,
                secure: false, // TODO: FIX | FALSE FOR LOCALHOST
                sameSite: "strict",
                path: "/"
            });

            return { status: 401, message: "Not logged in" };
        }
    }

    const body = await readBody(_event);
    const { setting, value } = body;

    if (setting === "event") {
        const occupiedEvent = await Event.findOne({ event: value });
        if (occupiedEvent) return { status: 400, message: "Event name is occupied" };

        let existingEvent = await Event.findOne({ event: session.username });
        if (!existingEvent) return { status: 404, message: "Event not found" };

        const oldUsername = existingEvent.event;
        existingEvent.event = value;
        await existingEvent.save();

        session.username = value;
        await session.save();

        await Session.deleteMany({ username: oldUsername });

        return { status: 200, message: "Event name changed successfully" };
    } else if (setting === "githubToken") {
        let existingEvent = await Event.findOne({ event: session.username });
        if (!existingEvent) return { status: 404, message: "Event not found" };

        // ! TODO: Check if the value is a valid token

        existingEvent.settings.githubToken = value;
        await existingEvent.save();

        return { status: 200, message: "GitHub token changed successfully" };
    } else if (setting === "logo") {
        let existingEvent = await Event.findOne({ event: session.username });
        if (!existingEvent) return { status: 404, message: "Event not found" };

        // ! TODO: Check if the URL is valid

        existingEvent.logo = value;
        await existingEvent.save();

        return { status: 200, message: "Logo URL changed successfully" };
    } else if (setting === "password") {
        const oldPass = body.oldPassword,
            newPass = value;

        let existingEvent = await Event.findOne({ event: session.username });
        if (!existingEvent) return { status: 404, message: "Event not found" };

        const passwordMatch = await bcrypt.compare(oldPass, existingEvent.settings.password);
        if (!passwordMatch) return { status: 401, message: "Wrong password" };

        existingEvent.settings.password = newPass;
        await existingEvent.save();

        await Session.deleteMany({ username: existingEvent.event });

        deleteCookie(_event, "session", {
            httpOnly: true,
            secure: false, // TODO: FIX | FALSE FOR LOCALHOST
            sameSite: "strict",
            path: "/"
        });

        deleteCookie(_event, "sessionExists", {
            httpOnly: false,
            secure: false, // TODO: FIX | FALSE FOR LOCALHOST
            sameSite: "strict",
            path: "/"
        });

        const sessionID = uuidv4();
        await Session.create({ sessionID, username: existingEvent.event });

        setCookie(_event, "session", sessionID, {
            httpOnly: true,
            secure: false, // TODO: FIX | FALSE FOR LOCALHOST
            sameSite: "strict",
            maxAge: 60 * 60,
            path: "/"
        });

        setCookie(_event, "sessionExists", true, {
            httpOnly: false,
            secure: false, // TODO: FIX | FALSE FOR LOCALHOST
            sameSite: "strict",
            maxAge: 60 * 60,
            path: "/"
        });

        return { status: 200, message: "Password changed successfully" };
    }
});