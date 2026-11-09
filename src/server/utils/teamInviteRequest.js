import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { StorageError } from '../storage/sqlite.js';
import { readWallNodeBody, stopWallBody } from '../services/wall-body.js';
export function teamInviteContext(event) {
    const edgeIP = process.env.RAILWAY_ENVIRONMENT_ID && getHeader(event, 'x-real-ip');
    const direct = getRequestIP(event);
    return {requestId:randomUUID(),ip:edgeIP && isIP(edgeIP) ? edgeIP : direct && isIP(direct) ? direct : 'unknown',userAgent:(getHeader(event,'user-agent') || '').slice(0,300)};
}
export async function teamInviteBody(event) {
    setHeader(event,'Cache-Control','no-store');setHeader(event,'Referrer-Policy','no-referrer');
    const base=useRuntimeConfig().githubAppBaseUrl;
    if(!base) throw new StorageError(503,'Team invitations are disabled.');
    // All app clients send JSON via same-origin fetch. Missing Origin is allowed for trusted CLI clients,
    // but cross-site/browser requests are rejected before reading a capability or setting cookies.
    const origin=getHeader(event,'origin'),site=getHeader(event,'sec-fetch-site');
    if((origin && origin!==new URL(base).origin) || site==='cross-site') throw new StorageError(403,'Open the invitation directly in DashHack.');
    if(!(getHeader(event,'content-type') || '').startsWith('application/json')) throw new StorageError(415,'Expected JSON.');
    if(Number(getHeader(event,'content-length'))>4096) {stopWallBody(event.node.req,event.node.res);throw new StorageError(413,'Request is too large.');}
    try {const body=JSON.parse((await readWallNodeBody(event.node.req,event.node.res,{limit:4096,timeoutMs:10000})).toString());if(!body || typeof body!=='object' || Array.isArray(body)) throw new Error();return body;}
    catch(error){throw new StorageError(error.status || 400,'Could not read invitation request.');}
}
