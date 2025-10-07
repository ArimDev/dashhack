import { getCookie, deleteCookie } from "h3";

import Session from "../../models/Session";

import { connectDB } from "../../utils/db";

export default defineEventHandler(async (_event) => {
    await connectDB();

    const sessionID = getCookie(_event, "session");
    if (!sessionID) {
        deleteCookie(_event, "sessionExists", {
            httpOnly: false,
            secure: !import.meta.dev,
            sameSite: "strict",
            path: "/"
        });
        return { status: 204, message: "Session doesn't exist, skipping..." };
    }

    await Session.deleteOne({ sessionID });

    deleteCookie(_event, "session", {
        httpOnly: true,
        secure: !import.meta.dev,
        sameSite: "strict",
        path: "/"
    });

    deleteCookie(_event, "sessionExists", {
        httpOnly: false,
        secure: !import.meta.dev,
        sameSite: "strict",
        path: "/"
    });

    return { status: 200, message: "Logged out" };
});
