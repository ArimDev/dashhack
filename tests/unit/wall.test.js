import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteStore, publicEvent } from '../../src/server/storage/sqlite.js';
import { WallStore, MAX_UPLOAD_BYTES } from '../../src/server/storage/wall.js';
import { XCollector, buildXQuery } from '../../src/server/services/x-collector.js';
const stores=[], dirs=[];
afterEach(() => { for (const s of stores.splice(0)) { try { s.close(); } catch {} } for (const d of dirs.splice(0)) rmSync(d,{ recursive:true,force:true }); });
async function setup(options) {
    const dir=mkdtempSync(join(tmpdir(),'dashhack-wall-')); dirs.push(dir);
    const filename=join(dir,'app.sqlite'), store=new SqliteStore(filename,options); stores.push(store);
    const id=await store.createEvent('Událost s mezerami','password123'), session=store.createSession(id);
    const wall=new WallStore(store);
    wall.updateSettings(session,'Událost s mezerami',{ enabled:true },0);
    return { store,wall,id,session,filename,name:'Událost s mezerami' };
}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0ioAAAAASUVORK5CYII=','base64');
const media={ mime:'image/png',data:png };
function action(ctx,post,action) { ctx.wall.action(ctx.session,ctx.name,{ postId:post.id,revision:post.revision,action }); return ctx.wall.moderationFeed(ctx.session,ctx.name).posts.find(p => p.id===post.id); }

describe('Social wall adapted from PR #6',() => {
    test('schema 6 migrates without changing existing event, notes or credentials; wall defaults off',async () => {
        const c=await setup();
        c.store.addTeam(c.session,c.name,{ teamName:'Tým',teamColor:'#123456',teamOriginality:'Originální' });
        c.store.db.exec('DROP TABLE wall_media; DROP TABLE wall_posts; DROP TABLE wall_settings; PRAGMA user_version=6');
        const before=publicEvent(c.store.getEvent(c.name)); c.store.close();
        const reopened=new SqliteStore(c.filename); stores.push(reopened);
        expect(publicEvent(reopened.getEvent(c.name))).toEqual(before);
        expect(new WallStore(reopened).publicFeed(c.name)).toEqual({ wall:{ enabled:false,publicUploadEnabled:true,windowMinutes:1440,idleCycleSeconds:25,idleWaitSeconds:30 },posts:[] });
        expect(() => new WallStore(reopened).submit(c.name,{ text:'Hello' })).toThrow('disabled');
        expect((await reopened.checkPassword(c.name,'password123'))._id).toBe(c.id);
        expect(reopened.db.query('PRAGMA integrity_check').get().integrity_check).toBe('ok');
    });
    test('pending attachments stay private; approval, hide, expiry, pin, rename and delete enforce access',async () => {
        let now=Date.now(); const c=await setup({ now:()=>now });
        let post=c.wall.submit(c.name,{ text:'Soukromá fotka',authorName:'Žák' },media);
        expect(c.wall.publicFeed(c.name).posts).toHaveLength(0);
        expect(() => c.wall.media(null,c.name,post.id)).toThrow('Media not found');
        expect(c.wall.media(c.session,c.name,post.id).data).toEqual(png);
        post=action(c,post,'approve'); expect(c.wall.publicFeed(c.name).posts).toHaveLength(1);
        expect(c.wall.media(null,c.name,post.id).data).toEqual(png);
        now+=2*86400000;
        // Refresh the organizer session after advancing past its one-hour lifetime.
        c.session=c.store.createSession(c.id);
        expect(c.wall.publicFeed(c.name).posts).toHaveLength(0);
        expect(() => c.wall.media(null,c.name,post.id)).toThrow('Media not found');
        post=action(c,post,'pin'); expect(c.wall.publicFeed(c.name).posts[0].pinned).toBe(true);
        await c.store.updateSetting(c.session,c.name,'event','Přejmenováno'); c.name='Přejmenováno';
        expect(post.imageUrl).toContain(`/api/wall/${c.id}/media/`);
        expect(c.wall.media(null,c.id,post.id).data).toEqual(png);
        post=action(c,post,'hide'); expect(c.wall.publicFeed(c.name).posts).toHaveLength(0);
        expect(() => c.wall.media(null,c.name,post.id)).toThrow('Media not found');
        action(c,post,'delete');
        expect(c.store.db.query('SELECT COUNT(*) AS n FROM wall_media').get().n).toBe(0);
        expect(c.wall.moderationFeed(c.session,c.name).posts).toHaveLength(0);
    });
    test('moderation ownership, expiry and revisions prevent cross-event writes and stale updates',async () => {
        const c=await setup(); const other=await c.store.createEvent('Other','password123'), otherSession=c.store.createSession(other);
        let post=c.wall.submit(c.name,{ text:'Note' });
        expect(() => c.wall.moderationFeed(null,c.name)).toThrow('expired');
        expect(() => c.wall.moderationFeed(otherSession,c.name)).toThrow('permission');
        expect(() => c.wall.action(otherSession,c.name,{ action:'approve',postId:post.id,revision:0 })).toThrow('permission');
        post=action(c,post,'reject');
        expect(() => c.wall.action(c.session,c.name,{ action:'approve',postId:post.id,revision:0 })).toThrow('changed');
        post=action(c,post,'unreject'); expect(post.status).toBe('pending');
        expect(() => c.wall.action(c.session,c.name,{ action:'delete',postId:post.id,revision:post.revision })).toThrow('Only rejected or hidden');
        expect(() => c.wall.updateSettings(c.session,c.name,{ enabled:false },0)).toThrow('changed');
        expect(c.wall.config(c.id).enabled).toBe(true);
        expect(() => c.wall.updateSettings(c.session,c.name,{ xPollIntervalMinutes:0 },1)).toThrow('Invalid');
        expect(() => c.wall.updateSettings(c.session,c.name,{ unexpected:true },1)).toThrow('Unknown');
        expect(() => c.wall.updateSettings(c.session,c.name,{ xQueryHandles:['@name OR evil'] },1)).toThrow('Invalid X handle');
    });
    test('filters, URL/type validation and media quotas reject atomically',async () => {
        const c=await setup(); c.wall=new WallStore(c.store,{ eventMediaLimit:24*1024*1024 }); c.wall.updateSettings(c.session,c.name,{ blacklistedKeywords:['spam'],blacklistedAuthors:['troll'] },1);
        for (const input of [{ text:'SPAM' },{ text:'Hi',authorName:'Troll' }]) expect(() => c.wall.submit(c.name,input,media)).toThrow('blocked');
        expect(() => c.wall.submit(c.name,{ text:'Hello',sourceUrl:'javascript:alert(1)' })).toThrow('HTTPS');
        expect(() => c.wall.submit(c.name,{ text:'x'.repeat(5001) })).toThrow('Invalid wall text');
        expect(() => c.wall.submit(c.name,{}, { mime:'image/png',data:Buffer.from('<svg/>') })).toThrow('does not match');
        expect(() => c.wall.submit(c.name,{}, { mime:'image/svg+xml',data:png })).toThrow('Unsupported');
        expect(() => c.wall.submit(c.name,{}, { mime:'image/png',data:Buffer.alloc(MAX_UPLOAD_BYTES+1) })).toThrow('2 MiB');
        expect(c.store.db.query('SELECT COUNT(*) AS n FROM wall_media').get().n).toBe(0);
        const large=Buffer.alloc(MAX_UPLOAD_BYTES); png.copy(large);
        for (let i=0;i<12;i++) c.wall.submit(c.name,{ text:`Photo ${i}` },{ mime:'image/png',data:large });
        expect(() => c.wall.submit(c.name,{},media)).toThrow('storage is full');
        expect(c.wall.moderationFeed(c.session,c.name).posts).toHaveLength(12);
    });
    test('public responses hide moderation filters and pending posts; disabled uploads reject server-side',async () => {
        const c=await setup();
        c.wall.updateSettings(c.session,c.name,{ blacklistedAuthors:['secret'],xQueryHandles:['@host'] },1);
        c.wall.submit(c.name,{ text:'Not approved' });
        const serialized=JSON.stringify(c.wall.publicFeed(c.name));
        for (const value of ['secret','@host','Not approved','blacklisted','xQuery']) expect(serialized).not.toContain(value);
        c.wall.updateSettings(c.session,c.name,{ publicUploadEnabled:false },2);
        expect(() => c.wall.submit(c.name,{ text:'Hello' })).toThrow('disabled');
        c.wall.updateSettings(c.session,c.name,{ enabled:false },3);
        expect(c.wall.publicFeed(c.name).posts).toHaveLength(0);
    });
    test('full SQLite snapshots preserve uploaded bytes and moderation after reopening',async () => {
        const c=await setup(); let post=c.wall.submit(c.name,{ text:'Backup' },media); post=action(c,post,'approve');
        const backup=join(dirs[dirs.length-1],'backup.sqlite'); c.store.db.query('VACUUM INTO ?').run(backup);
        const restored=new SqliteStore(backup);stores.push(restored);const wall=new WallStore(restored);
        expect(wall.publicFeed(c.name).posts[0].text).toBe('Backup');
        expect(wall.media(null,c.name,post.id).data).toEqual(png);
    });
});

describe('Optional in-process X collector',() => {
    async function enabled(options) {
        const c=await setup(options);
        c.wall.updateSettings(c.session,c.name,{ xEnabled:true,xQueryHashtags:['#hackathon'],xQueryHandles:['@host'] },1);
        return c;
    }
    const payload={ data:[{ id:'123',author_id:'u',text:'Hackathon!',created_at:'2026-11-08T20:00:00Z' }],includes:{ users:[{ id:'u',name:'Host',username:'host' }] } };
    test('correct grouped queries, manual queue, per-event deduplication and deleted tombstones',async () => {
        const c=await enabled(); let calls=0;
        const collector=new XCollector(c.store,'private-token',{ request:async (url,options) => {
            calls++; expect(new URL(url).searchParams.get('query')).toBe('(#hackathon OR from:host) -is:retweet');
            expect(options.headers.Authorization).toBe('Bearer private-token'); expect(options.redirect).toBe('error');
            return Response.json(payload);
        } });
        expect(buildXQuery(c.wall.config(c.id))).toBe('(#hackathon OR from:host) -is:retweet');
        expect((await collector.syncEvent(c.name)).imported).toBe(1);
        expect(c.wall.moderationFeed(c.session,c.name).posts[0].status).toBe('pending');
        expect((await collector.syncEvent(c.name)).imported).toBe(0);
        let post=c.wall.moderationFeed(c.session,c.name).posts[0];post=action(c,post,'reject');action(c,post,'delete');
        expect((await collector.syncEvent(c.name)).imported).toBe(0);
        expect(calls).toBe(3);
    });
    test('auto-approval is X-only; filters, scheduling and overlap guards apply',async () => {
        let now=Date.now(); const c=await enabled({ now:()=>now });
        c.wall.updateSettings(c.session,c.name,{ moderationMode:'auto' },2);
        let release; const response=new Promise(resolve => { release=resolve; });let calls=0;
        const collector=new XCollector(c.store,'token',{ request:async () => { calls++;return response; } });
        const first=collector.syncEvent(c.name);
        expect((await collector.syncEvent(c.name)).imported).toBe(0); expect(calls).toBe(1);
        release(Response.json(payload));await first;
        expect(c.wall.moderationFeed(c.session,c.name).posts[0].approved).toBe(true);
        expect(c.wall.submit(c.name,{ text:'Manual' }).status).toBe('pending');
        await collector.tick();expect(calls).toBe(1);
        now+=300001;await collector.tick();expect(calls).toBe(2);
        c.wall.updateSettings(c.session,c.name,{ xEnabled:false },3);
        now+=300001;await collector.tick();expect(calls).toBe(2);
        expect(c.wall.publicFeed(c.name).posts).toHaveLength(1);
    });
    test('no token means no requests; failures are redacted and rate limits delay retries',async () => {
        let now=Date.now();const c=await enabled({ now:()=>now });let calls=0;
        const request=async () => { calls++;return new Response('SECRET response',{ status:429 }); };
        await new XCollector(c.store,'',{ request }).tick();expect(calls).toBe(0);
        const collector=new XCollector(c.store,'private-token',{ request });await collector.tick();
        expect(calls).toBe(1);expect(c.wall.config(c.id).xLastPollError).toContain('rate limit');
        expect(JSON.stringify(c.wall.config(c.id))).not.toContain('SECRET');
        now+=300001;await collector.tick();expect(calls).toBe(1);
        now+=600001;await collector.tick();expect(calls).toBe(2);
    });
});
