import { EVENT_URI_NAME, RENAMED_EVENT_ID, legacyEventRedirect } from '../../shared/eventRoutes.js';
export default defineEventHandler(event=>{
    const url=getRequestURL(event),destination=legacyEventRedirect(url.pathname);
    if(!destination) return;
    // Preserve upload bodies from an old open tab; other writes must use the current UI.
    if(!['GET','HEAD'].includes(event.method) && !url.pathname.startsWith('/api/wall/')) return;
    if(!getStore().db.query('SELECT 1 FROM events WHERE id=? AND name=?').get(RENAMED_EVENT_ID,EVENT_URI_NAME)) return;
    setHeader(event,'Cache-Control','no-store');
    return sendRedirect(event,destination+url.search,307);
});
