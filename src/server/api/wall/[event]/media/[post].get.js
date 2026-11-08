export default apiHandler(event => {
    const media = getWallStore().media(getCookie(event,'session'),getRouterParam(event,'event',{ decode: true }),getRouterParam(event,'post'));
    const bytes = Buffer.from(media.data), range = getHeader(event,'range');
    setHeaders(event,{ 'Content-Type': media.mime, 'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store', 'Accept-Ranges': 'bytes', 'Content-Security-Policy': "default-src 'none'; sandbox" });
    if (!range) { setHeader(event,'Content-Length',String(bytes.length)); return bytes; }
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match?.[2]));
    const end = match?.[1] ? (match[2] ? Math.min(Number(match[2]), bytes.length-1) : bytes.length-1) : bytes.length-1;
    if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length) {
        setResponseStatus(event,416); setHeader(event,'Content-Range',`bytes */${bytes.length}`); return '';
    }
    setResponseStatus(event,206);
    setHeaders(event,{ 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': String(end-start+1) });
    return bytes.subarray(start,end+1);
});
