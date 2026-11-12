export const SESSION_CHANGE_KEY = 'dashhack:session-change';
export function notifySessionChange() {
  // Only an invalidation hint crosses tabs; cookies and server authorization stay authoritative.
  try { localStorage.setItem(SESSION_CHANGE_KEY, `${Date.now()}-${Math.random()}`); } catch {}
}
