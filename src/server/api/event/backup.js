export default apiHandler((event) => {
    if (event.method !== 'GET') return { status: 405, message: 'Method Not Allowed' };
    const data = getStore().getEvent(getQuery(event).event);
    if (!data) return { status: 404, message: 'Event not found' };
    const { settings: _settings, ...backup } = data;
    const filename = `dh-${encodeURIComponent(data.event)}-${new Date().toISOString().slice(0, 10)}.json`;
    setHeaders(event, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${filename}"` });
    return JSON.stringify(backup, null, 2);
});
