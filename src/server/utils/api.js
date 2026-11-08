import { StorageError } from '../storage/sqlite.js';

// Preserve the existing JSON-status contract used by the UI.
export function apiHandler(handler) {
    return defineEventHandler(async (event) => {
        try { return await handler(event); }
        catch (error) {
            if (error instanceof StorageError) return { status: error.status, message: error.message };
            throw error;
        }
    });
}

export function setSessionCookies(event, id) {
    const options = { secure: !import.meta.dev, sameSite: 'strict', maxAge: 3600, path: '/' };
    setCookie(event, 'session', id, { ...options, httpOnly: true });
    setCookie(event, 'sessionExists', 'true', { ...options, httpOnly: false });
}

export function clearSessionCookies(event) {
    deleteCookie(event, 'session', { path: '/' });
    deleteCookie(event, 'sessionExists', { path: '/' });
}
