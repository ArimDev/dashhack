import {DiscordStore} from '../storage/discord.js';
import {readWallNodeBody,stopWallBody} from '../services/wall-body.js';
import {StorageError} from '../storage/sqlite.js';
export function getDiscordStore(){return new DiscordStore(getStore());}
export function discordBaseUrl(event){return getRequestURL(event,{xForwardedHost:false,xForwardedProto:true}).origin;}
export function discordSameOrigin(event){const origin=getHeader(event,'origin');if(getHeader(event,'sec-fetch-site')==='cross-site'||(origin&&origin!==discordBaseUrl(event)))throw new StorageError(403,'Neplatný původ požadavku.');}
export async function discordBody(event,limit=262144){
    if(!getHeader(event,'content-type')?.toLowerCase().startsWith('application/json'))throw new StorageError(415,'Požadavek musí být JSON.');
    const length=getHeader(event,'content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>limit)){stopWallBody(event.node.req,event.node.res);throw new StorageError(413,'Příliš velký požadavek.');}
    let raw;try{raw=await readWallNodeBody(event.node.req,event.node.res,{limit,timeoutMs:10000});}catch(error){throw new StorageError(error.status||400,'Požadavek se nepodařilo načíst.');}
    let body;try{body=JSON.parse(raw.toString('utf8'));}catch{throw new StorageError(400,'Neplatný JSON.');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new StorageError(400,'Neplatný JSON objekt.');
    return {raw,body};
}
export function discordPrivateHeaders(event){setHeaders(event,{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'});}
