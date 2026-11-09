// Compatibility for the real event's former demo URL. Other events are unaffected.
export const EVENT_URI_NAME = 'ATT Hackathon Junior 2026';
export const LEGACY_EVENT_NAME = 'Student Hackathon Demo';
export const RENAMED_EVENT_ID = '97c87fe6-f510-4117-9558-1e2380fdaa6a';
export function legacyEventRedirect(pathname) {
    const parts=pathname.split('/');
    const index=parts[1]==='app'?2:parts[1]==='api' && ['event','wall'].includes(parts[2])?3:parts[2]==='wall'?1:-1;
    if(index<0 || !parts[index]) return null;
    try {if(decodeURIComponent(parts[index])!==LEGACY_EVENT_NAME)return null;}catch{return null;}
    parts[index]=encodeURIComponent(EVENT_URI_NAME);
    return parts.join('/');
}
