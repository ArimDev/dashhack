import { WALL_LAYOUT_DEFAULTS } from '../../src/shared/wallDisplay.js';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteStore, publicEvent } from '../../src/server/storage/sqlite.js';
import { WallStore, MAX_UPLOAD_BYTES } from '../../src/server/storage/wall.js';
import { XCollector, buildXQuery } from '../../src/server/services/x-collector.js';
import { InstagramCollector } from '../../src/server/services/instagram-collector.js';
import sharp from 'sharp';
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
        c.store.db.exec('DROP TABLE IF EXISTS discord_message_cleanup; DROP TABLE IF EXISTS discord_notifications; DROP TABLE discord_matrix_flows; DROP TABLE discord_actions; DROP TABLE discord_settings; DROP TABLE team_invite_audit; DROP TABLE team_invite_flows; DROP TABLE team_invite_links; DROP TABLE wall_media; DROP TABLE wall_posts; DROP TABLE wall_settings; PRAGMA user_version=6');
        const before=publicEvent(c.store.getEvent(c.name)); c.store.close();
        const reopened=new SqliteStore(c.filename); stores.push(reopened);
        expect(publicEvent(reopened.getEvent(c.name))).toEqual(before);
        expect(new WallStore(reopened).publicFeed(c.name)).toEqual({ wall:{ ...WALL_LAYOUT_DEFAULTS,title:'',enabled:false,publicUploadEnabled:true,windowMinutes:1440,idleCycleSeconds:25,idleWaitSeconds:5,scrollSpeed:40,revision:0 },posts:[],total:0,hasMore:false });
        expect(() => new WallStore(reopened).submit(c.name,{ text:'Hello' })).toThrow('disabled');
        expect((await reopened.checkPassword(c.name,'password123'))._id).toBe(c.id);
        expect(reopened.db.query('PRAGMA integrity_check').get().integrity_check).toBe('ok');
    });
    test('moderation paging searches all posts with literal terms, stable pages and event ownership',async()=>{
        const c=await setup();
        for(let i=0;i<27;i++) {
            const p=c.wall.submit(c.name,{text:i===3?'100% ready':i===4?'under_score':`Project ${i}`,authorName:i===7?'FindMe':'Student'});
            c.store.db.query('UPDATE wall_posts SET created_at=?,status=? WHERE event_id=? AND id=?').run(new Date(c.store.now()-i*1000).toISOString(),i%2?'approved':'pending',c.id,p.id);
        }
        const a=c.wall.moderationFeed(c.session,c.name,{page:1,perPage:10}),b=c.wall.moderationFeed(c.session,c.name,{page:2,perPage:10}),d=c.wall.moderationFeed(c.session,c.name,{page:3,perPage:10});
        expect(a.pagination).toEqual({page:1,perPage:10,pageCount:3,totalMatched:27});expect(new Set([...a.posts,...b.posts,...d.posts].map(p=>p.id)).size).toBe(27);expect(d.posts).toHaveLength(7);
        expect(c.wall.moderationFeed(c.session,c.name,{search:'findme'}).posts[0].authorName).toBe('FindMe');
        for(const search of ['%','_'])expect(c.wall.moderationFeed(c.session,c.name,{search}).pagination.totalMatched).toBe(1);
        expect(c.wall.moderationFeed(c.session,c.name,{status:'approved'}).pagination.totalMatched).toBe(13);
        expect(c.wall.moderationFeed(c.session,c.name,{page:99,perPage:10}).pagination.page).toBe(3);
        expect(c.wall.moderationFeed(c.session,c.name,{sort:'oldest'}).posts[0].text).toBe('Project 26');
        for(const view of [{page:0},{perPage:101},{sort:'unsafe'},{status:'unknown'},{search:'x'.repeat(201)}])expect(()=>c.wall.moderationFeed(c.session,c.name,view)).toThrow();
        expect(()=>c.wall.moderationFeed(null,c.name,{page:1})).toThrow('expired');
    });
    test('wall display title is validated, public and does not change collector settings',async()=>{
        const c=await setup();const before=c.wall.config(c.id);
        c.wall.updateSettings(c.session,c.name,{title:'AT&T Hackathon Junior 2026'},before.revision);
        expect(c.wall.publicFeed(c.name).wall.title).toBe('AT&T Hackathon Junior 2026');
        expect(c.wall.config(c.id).xEnabled).toBe(before.xEnabled);expect(c.wall.config(c.id).instagramEnabled).toBe(before.instagramEnabled);
        expect(()=>c.wall.updateSettings(c.session,c.name,{title:'x'.repeat(121)},before.revision+1)).toThrow('Invalid');
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

const photo = await sharp({ create: { width: 4, height: 3, channels: 3, background: '#e00' } }).jpeg().toBuffer();
describe('Optional Apify Instagram collector', () => {
    async function enabled(options) {
        const c = await setup(options);
        expect(c.wall.config(c.id).instagramPollIntervalMinutes).toBe(20);
        c.wall.updateSettings(c.session, c.name, { instagramEnabled: true, instagramPollIntervalMinutes: 5 }, 1);
        return c;
    }
    const payload = [
        { caption: 'Hackathon!\n#coding', url: 'https://www.instagram.com/p/ABC_123/?utm_source=test', shortCode: 'ABC_123',
            ownerUsername: 'javascript.js', ownerFullName: 'JavaScript', type: 'Image',
            displayUrl: 'https://scontent.cdninstagram.com/photo.jpg', timestamp: '2026-10-24T09:33:39.000Z' },
        { caption: 'Bad source', url: 'https://example.com/p/ABC_123/', ownerUsername: 'host' },
    ];
    const image = () => new Response(photo, { headers: { 'content-type': 'image/jpeg' } });
    // Apify mock: last-run status, run start and dataset items; Instagram CDN hosts return a photo.
    const apifyResponse = (url, options, items, lastStatus = 'SUCCEEDED') => {
        const path = new URL(url).pathname;
        if (path.endsWith('/runs/last')) return Response.json({ data: { status: lastStatus } });
        if (options?.method === 'POST') return Response.json({ data: { status: 'SUCCEEDED' } }, { status: 201 });
        return Response.json(items);
    };
    const provider = items => async (url, options) => new URL(url).hostname === 'api.apify.com' ? apifyResponse(url, options, items) : image();
    test('task dataset requests, downloaded photos, manual approval, stable deduplication and shared auto approval', async () => {
        const c = await enabled(); const urls = []; let starts = 0, lastStatus = 'SUCCEEDED';
        const logs = [], warnings = [];
        const logger = { info: (...args) => logs.push(args), warn: (...args) => warnings.push(args) };
        const collector = new InstagramCollector(c.store, 'private-key', { logger, request: async (url, options) => {
            urls.push(url); const parsed = new URL(url);
            if (parsed.hostname !== 'api.apify.com') { expect(options.headers).toBeUndefined(); return image(); }
            expect(options.headers.Authorization).toBe('Bearer private-key'); expect(parsed.searchParams.has('token')).toBe(false);
            if (parsed.pathname === '/v2/actor-tasks/EfFPXy7N73Gc1JTMQ/runs/last') return Response.json({ data: { status: lastStatus } });
            if (options.method === 'POST') {
                starts++; expect(parsed.pathname).toBe('/v2/actor-tasks/EfFPXy7N73Gc1JTMQ/runs');
                expect(parsed.searchParams.get('waitForFinish')).toBe('60');
                return Response.json({ data: { status: 'SUCCEEDED' } }, { status: 201 });
            }
            expect(parsed.pathname).toBe('/v2/actor-tasks/EfFPXy7N73Gc1JTMQ/runs/last/dataset/items');
            expect(parsed.searchParams.get('status')).toBe('SUCCEEDED'); expect(parsed.searchParams.get('clean')).toBe('true');
            expect(parsed.searchParams.has('token')).toBe(false);
            expect(options.headers.Authorization).toBe('Bearer private-key'); expect(options.redirect).toBe('error');
            return Response.json(payload);
        } });
        expect((await collector.syncEvent(c.name)).imported).toBe(1);
        expect(logs.find(entry => entry[0].endsWith('Fetch succeeded'))[1]).toMatchObject({ fetched: 2, imported: 1, invalid: 1, mediaFailed: 0 });
        let post = c.wall.moderationFeed(c.session, c.name).posts[0];
        expect(post).toMatchObject({ authorName: 'JavaScript', handle: '@javascript.js', text: 'Hackathon!\n#coding',
            imageUrl: `/api/wall/${c.id}/media/instagram-ABC_123`, videoUrl: '', createdAt: '2026-10-24T09:33:39.000Z' });
        expect(c.wall.media(c.session, c.name, post.id).mime).toBe('image/webp');
        expect(post.platform).toBe('instagram'); expect(post.status).toBe('pending'); expect(post.sourceUrl).toBe('https://www.instagram.com/p/ABC_123/');
        lastStatus = 'RUNNING';
        expect((await collector.syncEvent(c.name)).imported).toBe(0);
        expect(starts).toBe(1);
        expect(urls.filter(url => url.includes('cdninstagram'))).toHaveLength(1);
        expect(logs.filter(entry => entry[0].endsWith('Fetch succeeded'))[1][1].duplicates).toBe(1);
        expect(JSON.stringify(logs)).not.toContain('private-key'); expect(warnings).toHaveLength(0);
        post = action(c, post, 'reject'); action(c, post, 'delete');
        expect((await collector.syncEvent(c.name)).imported).toBe(0);
        const lastPoll = c.wall.config(c.id).instagramLastPollAt;
        c.wall.updateSettings(c.session, c.name, { moderationMode: 'auto', blacklistedKeywords: ['spam'] }, 2);
        expect(c.wall.config(c.id).instagramLastPollAt).toBe(lastPoll);
        expect(c.wall.config(c.id).xEnabled).toBe(false); expect(c.wall.config(c.id).moderationMode).toBe('auto');
        const downloads = [], freshItems = provider([
            { caption: 'A new post', url: 'https://instagram.com/reel/FRESH/', ownerUsername: 'creator', displayUrl: 'https://x.fbcdn.net/a.jpg' },
            { caption: 'spam', url: 'https://instagram.com/p/BLOCKED/', displayUrl: 'https://x.fbcdn.net/b.jpg' },
        ]);
        const fresh = new InstagramCollector(c.store, 'key', { request: (url, options) => { downloads.push(url); return freshItems(url, options); } });
        expect((await fresh.syncEvent(c.name)).imported).toBe(1);
        expect(downloads).not.toContain('https://x.fbcdn.net/b.jpg');
        expect(c.wall.publicFeed(c.name).posts[0].approved).toBe(true);
        expect(c.wall.submit(c.name, { text: 'Public upload', platform: 'instagram' }).status).toBe('pending');
    });
    test('failed task runs preserve posts and back off instead of reporting an older dataset as success', async () => {
        let now = Date.now(); const c = await enabled({ now: () => now });
        const existing = c.wall.submit(c.name, { id: 'instagram-EXISTING', platform: 'instagram', text: 'Keep this post' }, null, { collected: true });
        const logs = [], warnings = [], calls = [];
        const collector = new InstagramCollector(c.store, 'private-key', {
            logger: { info: (...args) => logs.push(args), warn: (...args) => warnings.push(args) },
            request: async (url, options) => {
                calls.push(url);
                if (new URL(url).pathname.endsWith('/runs/last')) return Response.json({ data: { status: 'SUCCEEDED' } });
                if (options.method === 'POST') return Response.json({ data: { status: 'FAILED', statusMessage: 'private-key in provider diagnostic' } }, { status: 201 });
                return Response.json(payload); // An older successful dataset must never conceal the failed new run.
            },
        });
        await collector.tick();
        expect(calls).toHaveLength(2);
        expect(c.wall.config(c.id)).toMatchObject({ instagramFailureCount: 1, instagramEnabled: true });
        expect(c.wall.config(c.id).instagramLastPollError).toContain('FAILED');
        expect(Date.parse(c.wall.config(c.id).instagramNextPollAt) - now).toBe(15 * 60000);
        expect(c.wall.moderationFeed(c.session, c.name).posts).toEqual([existing]);
        expect(logs.some(entry => entry[0].endsWith('Fetch succeeded'))).toBe(false);
        expect(JSON.stringify(warnings)).not.toContain('private-key');
        now += 5 * 60000; await collector.tick(); expect(calls).toHaveLength(2);
        now += 10 * 60000; await collector.tick(); expect(calls).toHaveLength(4);
        expect(c.wall.config(c.id).instagramFailureCount).toBe(2);
        expect(Date.parse(c.wall.config(c.id).instagramNextPollAt) - now).toBe(30 * 60000);
    });
    test('aborted, timed-out and malformed task results fail without exposing provider content', async () => {
        const c = await enabled(), warnings = [];
        for (const status of ['ABORTED', 'TIMED-OUT', 'private-key', undefined]) {
            let calls = 0;
            const collector = new InstagramCollector(c.store, 'private-key', {
                logger: { info: () => {}, warn: (...args) => warnings.push(args) },
                request: async (url, options) => {
                    calls++;
                    return Response.json({ data: { status: options.method === 'POST' ? status : 'SUCCEEDED', statusMessage: 'private-key' } });
                },
            });
            const result = await collector.syncEvent(c.name);
            expect(result.imported).toBe(0); expect(result.error).toBeTruthy(); expect(calls).toBe(2);
            expect(result.error).not.toContain('private-key');
        }
        expect(c.wall.moderationFeed(c.session, c.name).posts).toHaveLength(0);
        expect(JSON.stringify(warnings)).not.toContain('private-key');
    });
    test('carousel covers and unsafe or unavailable photos are skipped until a later poll', async () => {
        const c = await enabled(); let cdnUp = false;
        const items = [
            { url: 'https://instagram.com/p/CAROUSEL/', caption: 'Gallery', type: 'Sidecar', childPosts: [{ displayUrl: 'https://scontent.cdninstagram.com/first.jpg' }] },
            { url: 'https://instagram.com/p/FOREIGN/', caption: 'Text', displayUrl: 'https://example.com/photo.jpg', timestamp: 'invalid' },
            { url: 'https://instagram.com/p/CREDS/', caption: 'Text', displayUrl: 'https://user:secret@scontent.cdninstagram.com/photo.jpg' },
            { url: 'https://instagram.com/reel/VIDEO/', caption: 'Reel', type: 'Video', videoUrl: 'https://scontent.cdninstagram.com/reel.mp4',
                displayUrl: 'https://scontent.cdninstagram.com/poster.jpg' },
        ];
        const seen = [];
        const collector = new InstagramCollector(c.store, 'key', { logger: { info: () => {}, warn: () => {} }, request: async (url, options) => {
            seen.push(url);
            if (new URL(url).hostname === 'api.apify.com') return apifyResponse(url, options, items);
            if (url.endsWith('.mp4')) throw new Error('video must not be downloaded');
            return cdnUp ? image() : new Response('gone', { status: 403 });
        } });
        expect((await collector.syncEvent(c.name)).imported).toBe(0);
        expect(seen.some(url => url.includes('example.com') || url.includes('secret'))).toBe(false);
        cdnUp = true;
        expect((await collector.syncEvent(c.name)).imported).toBe(2);
        const posts = c.wall.moderationFeed(c.session, c.name).posts;
        expect(posts.map(post => post.id).sort()).toEqual(['instagram-CAROUSEL', 'instagram-VIDEO']);
        expect(posts.find(post => post.id === 'instagram-VIDEO')).toMatchObject({ videoUrl: '', imageUrl: `/api/wall/${c.id}/media/instagram-VIDEO` });
        const oversized = new InstagramCollector(c.store, 'key', { request: async (url, options) => new URL(url).hostname === 'api.apify.com'
            ? apifyResponse(url, options, [{ url: 'https://instagram.com/p/HUGE/', displayUrl: 'https://scontent.cdninstagram.com/huge.jpg' }])
            : new Response(Buffer.alloc(3 * 1024 * 1024), { headers: { 'content-type': 'image/jpeg' } }) });
        expect((await oversized.syncEvent(c.name)).imported).toBe(0);
    });
    test('later polls repair placeholders without replacing content or moderation decisions', async () => {
        const c = await enabled();
        const input = { id: 'instagram-ABC_123', platform: 'instagram', authorName: 'Instagram', text: 'Instagram post' };
        let old = c.wall.submit(c.name, input, null, { collected: true });
        old = action(c, old, 'approve'); old = action(c, old, 'pin');
        const collector = new InstagramCollector(c.store, 'key', { logger: { info: () => {}, warn: () => {} }, request: provider(payload) });
        expect((await collector.syncEvent(c.name)).imported).toBe(0);
        const repaired = c.wall.moderationFeed(c.session, c.name).posts[0];
        expect(repaired).toMatchObject({ authorName: 'JavaScript', handle: '@javascript.js', text: 'Hackathon!\n#coding', imageUrl: '',
            status: old.status, hidden: old.hidden, pinned: old.pinned, createdAt: old.createdAt, revision: old.revision + 1 });
        await collector.syncEvent(c.name);
        expect(c.wall.moderationFeed(c.session, c.name).posts[0]).toEqual(repaired);
    });
    test('absent key, overlap guard, original errors and persisted rate-limit scheduling', async () => {
        let now = Date.now(); const c = await enabled({ now: () => now }); let calls = 0, release;
        const warnings = [], logger = { info: () => {}, warn: (...args) => warnings.push(args) };
        const pending = new Promise(resolve => { release = resolve; });
        const request = async () => { calls++; return pending; };
        await new InstagramCollector(c.store, '', { request }).tick(); expect(calls).toBe(0);
        const collector = new InstagramCollector(c.store, 'key', { request, logger });
        const first = collector.syncEvent(c.name); await collector.syncEvent(c.name); expect(calls).toBe(1);
        release(new Response('secret provider body', { status: 429 }));
        expect((await first).error).toContain('rate limit');
        expect(warnings[0][1].error).toContain('rate limit');
        await collector.tick(); now += 5 * 60000; await collector.tick(); expect(calls).toBe(1);
        now += 10 * 60000; await collector.tick(); expect(calls).toBe(2);
        expect(c.wall.config(c.id).instagramLastPollError).not.toContain('secret');
        const originalError = new Error('Unable to verify the first certificate');
        const failure = new InstagramCollector(c.store, 'key', { logger, request: async () => { throw originalError; } });
        expect((await failure.syncEvent(c.name)).error).toBe(originalError.message);
        expect(c.wall.config(c.id).instagramLastPollError).toBe(originalError.message);
        expect(warnings.at(-1)[1].error).toBe(originalError.message);
        for (const message of ['secret key in request headers', 'Unable to verify the first certificate: secret key']) {
            const redacted = new InstagramCollector(c.store, 'key', { logger, request: async () => { throw new Error(message); } });
            expect((await redacted.syncEvent(c.name)).error).not.toContain('secret');
            expect(c.wall.config(c.id).instagramLastPollError).not.toContain('secret');
        }
        expect(JSON.stringify(warnings)).not.toContain('secret');
    });
    test('stop is authorized, fences stale enables and prevents imports from an in-flight request', async () => {
        const c = await enabled();
        let release, calls = 0; const pending = new Promise(resolve => { release = resolve; });
        const collector = new InstagramCollector(c.store, 'key', { request: async () => { calls++; return pending; } });
        const first = collector.syncEvent(c.name);
        expect(() => c.wall.action(null, c.name, { action: 'pauseInstagram' })).toThrow('expired');
        const other = await c.store.createEvent('Other', 'password123');
        expect(() => c.wall.action(c.store.createSession(other), c.name, { action: 'pauseInstagram' })).toThrow('permission');
        const stopped = c.wall.action(c.session, c.name, { action: 'pauseInstagram', revision: 0 });
        expect(stopped.instagramEnabled).toBe(false);
        expect(() => c.wall.updateSettings(c.session, c.name, { instagramEnabled: true }, 2)).toThrow('changed');
        release(Response.json(payload)); expect((await first).imported).toBe(0); expect(calls).toBe(1);
        await collector.tick(); expect(calls).toBe(1);
    });
    test('missing task run has safe diagnostics and persisted backoff across restart', async () => {
        let now = Date.now(), calls = 0;
        const c = await enabled({ now: () => now }), warnings = [];
        const request = async () => { calls++; return Response.json({ error: { type: 'record-not-found', message: 'private-key' } }, { status: 404 }); };
        const logger = {info:()=>{},warn:(...args)=>warnings.push(args)};
        const collector = new InstagramCollector(c.store,'private-key',{request,logger});
        await collector.tick();
        let wall = c.wall.config(c.id);
        expect(wall.instagramLastPollError).toContain('finished run');
        expect(Date.parse(wall.instagramNextPollAt)-now).toBe(15*60000);
        const restarted = new InstagramCollector(c.store,'private-key',{request,logger});
        now+=5*60000;await restarted.tick();expect(calls).toBe(2);
        now+=10*60000;await restarted.tick();expect(calls).toBe(4);
        wall=c.wall.config(c.id);expect(Date.parse(wall.instagramNextPollAt)-now).toBe(30*60000);
        expect(JSON.stringify(warnings)).not.toContain('private-key');expect(wall.instagramEnabled).toBe(true);
    });
    test('Instagram respects Retry-After and clears failure diagnostics after a successful scheduled retry',async()=>{
        let now=Date.now(),calls=0;const c=await enabled({now:()=>now});
        const collector=new InstagramCollector(c.store,'key',{logger:{info:()=>{},warn:()=>{}},request:async (url,options)=>{
            if (new URL(url).hostname!=='api.apify.com') return image();
            if (new URL(url).pathname.endsWith('/runs/last')) calls++;
            return calls===1?new Response('not JSON; private response',{status:503,headers:{'Retry-After':'1200'}}):apifyResponse(url,options,payload);
        }});
        await collector.tick();expect(c.wall.config(c.id).instagramLastPollError).toContain('HTTP 503');
        expect(Date.parse(c.wall.config(c.id).instagramNextPollAt)-now).toBe(20*60000);
        now+=19*60000;await collector.tick();expect(calls).toBe(1);
        now+=60000;await collector.tick();expect(calls).toBe(2);
        expect(c.wall.config(c.id)).toMatchObject({instagramLastPollError:'',instagramNextPollAt:null,instagramFailureCount:0});
        expect(c.wall.moderationFeed(c.session,c.name).posts).toHaveLength(1);
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
    test('auto-approval is collector-only; filters, scheduling and overlap guards apply',async () => {
        let now=Date.parse('2026-11-09T10:00:00Z'); const c=await enabled({ now:()=>now });
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
    test('pause ignores stale caller revisions, preserves query fields, enforces ownership and survives a new collector',async () => {
        let now=Date.now(); const c=await enabled({ now:()=>now });
        const old=c.wall.config(c.id);
        c.wall.updateSettings(c.session,c.name,{ windowMinutes:1800 },old.revision);
        const other=await c.store.createEvent('Unrelated','password123'), otherSession=c.store.createSession(other);
        expect(() => c.wall.action(null,c.name,{action:'pauseX'})).toThrow('expired');
        expect(() => c.wall.action(otherSession,c.name,{action:'pauseX'})).toThrow('permission');
        c.wall.action(c.session,c.name,{action:'pauseX',revision:old.revision});
        const stopped=c.wall.config(c.id);
        expect(stopped.xEnabled).toBe(false); expect(stopped.windowMinutes).toBe(1800);
        expect(stopped.xQueryHashtags).toEqual(old.xQueryHashtags); expect(stopped.xQueryHandles).toEqual(old.xQueryHandles);
        expect(c.wall.action(c.session,c.name,{action:'pauseX'}).revision).toBe(stopped.revision+1);
        expect(() => c.wall.updateSettings(c.session,c.name,{xEnabled:true},stopped.revision)).toThrow('changed');
        expect(() => c.wall.updateSettings(c.session,c.name,{xEnabled:true},old.revision)).toThrow('changed');
        let calls=0; const request=async()=>{calls++;return Response.json(payload)};
        const collector=new XCollector(c.store,'token',{request});
        await collector.tick(); now+=3600000; await collector.tick();
        const reopened=new SqliteStore(c.filename,{now:()=>now});stores.push(reopened);
        await new XCollector(reopened,'token',{request}).tick();
        expect(calls).toBe(0);
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


describe('Wall incremental pages and display speed',()=>{
    test('pages preserve the bounded approved-feed order without leaking pending/hidden posts',async()=>{
        const c=await setup();
        for(let i=0;i<31;i++){const p=c.wall.submit(c.name,{text:'Post '+i});action(c,p,'approve');}
        c.wall.submit(c.name,{text:'Still pending'});
        const all=c.wall.publicFeed(c.name),first=c.wall.publicFeed(c.name,{limit:12}),rest=c.wall.publicFeed(c.name,{limit:188,offset:12});
        expect(first.posts).toHaveLength(12);expect(first.total).toBe(31);expect(first.hasMore).toBe(true);
        expect([...first.posts,...rest.posts]).toEqual(all.posts);expect(rest.hasMore).toBe(false);
        for(const options of [{limit:0},{limit:201},{offset:-1},{offset:200},{limit:1.5}])expect(()=>c.wall.publicFeed(c.name,options)).toThrow('Invalid wall page');
    });
    test('speed updates are revision-checked, event-owned and preserve collection settings',async()=>{
        const c=await setup();
        c.wall.updateSettings(c.session,c.name,{xEnabled:true,xQueryHashtags:['#keepx'],instagramEnabled:true,instagramQueryHashtags:['#keepig'],moderationMode:'auto'},c.wall.config(c.id).revision);
        const old=c.wall.config(c.id);
        expect(()=>c.wall.updateSettings(null,c.name,{scrollSpeed:60},old.revision)).toThrow('expired');
        const updated=c.wall.updateSettings(c.session,c.name,{scrollSpeed:60},old.revision);
        expect(updated.scrollSpeed).toBe(60);expect(updated.xEnabled).toBe(old.xEnabled);expect(updated.instagramEnabled).toBe(old.instagramEnabled);
        expect(updated.xQueryHashtags).toEqual(['#keepx']);expect(updated.instagramQueryHashtags).toEqual(['#keepig']);expect(updated.moderationMode).toBe('auto');
        expect(c.wall.publicFeed(c.name).wall.scrollSpeed).toBe(60);expect(c.wall.publicFeed(c.name).wall.revision).toBe(updated.revision);
        expect(()=>c.wall.updateSettings(c.session,c.name,{scrollSpeed:20},old.revision)).toThrow('changed');
        for(const scrollSpeed of [0,101,'60',30.5])expect(()=>c.wall.updateSettings(c.session,c.name,{scrollSpeed},updated.revision)).toThrow('Invalid');
    });
});

test('organizers edit community posts without changing media, pins or moderation; stale and unauthorized edits fail',async()=>{
 const c=await setup();let p=c.wall.submit(c.name,{text:'Placeholder',authorName:'Demo'},media);
 p=action(c,p,'approve');p=action(c,p,'pin');
 const edit={action:'edit',postId:p.id,revision:p.revision,text:'<b>Program akce</b>',authorName:'Pořadatelé'};
 expect(()=>c.wall.action(null,c.name,edit)).toThrow('expired');
 const other=await c.store.createEvent('Other event','password123');
 expect(()=>c.wall.action(c.store.createSession(other),c.name,edit)).toThrow();
 for(const bad of [{text:'x'.repeat(5001)},{authorName:'x'.repeat(81)},{text:null}])expect(()=>c.wall.action(c.session,c.name,{...edit,...bad})).toThrow();
 c.wall.action(c.session,c.name,edit);
 const updated=c.wall.moderationFeed(c.session,c.name).posts[0];
 expect(updated).toEqual({...p,text:edit.text,authorName:edit.authorName,revision:p.revision+1});
 expect(c.wall.media(c.session,c.name,p.id).data).toEqual(media.data);
 expect(()=>c.wall.action(c.session,c.name,edit)).toThrow('changed');
 c.store.db.query("UPDATE wall_posts SET platform='x' WHERE event_id=? AND id=?").run(c.id,p.id);
 c.wall.action(c.session,c.name,{...edit,revision:updated.revision});
 expect(c.wall.moderationFeed(c.session,c.name).posts[0].platform).toBe('x');
});

test('formatted pinned announcements can remove and replace photos atomically without changing moderation',async()=>{
 const c=await setup();let p=c.wall.submit(c.name,{text:'Old announcement',authorName:'Organizers'},media);
 p=action(c,p,'approve');p=action(c,p,'pin');
 const richText=[{type:'paragraph',runs:[{text:'Schedule',bold:true}]},{type:'bullet',runs:[{text:'Bring your laptop',italic:true}]}];
 const edit={action:'edit',postId:p.id,revision:p.revision,authorName:'Organizers',text:'ignored',richText,removeImage:true};
 expect(()=>c.wall.action(c.session,c.name,{...edit,richText:[{type:'html',runs:[]}]})).toThrow('formatting');
 expect(()=>c.wall.action(c.session,c.name,{...edit,richText:[{type:'paragraph',runs:[{text:'a'.repeat(5001)}]}]})).toThrow('5000');
 expect(()=>c.wall.action(c.session,c.name,{...edit,richText:[],text:''})).toThrow('required');
 expect(c.wall.media(c.session,c.name,p.id).data).toEqual(media.data);
 c.wall.action(c.session,c.name,edit);
 const saved=c.wall.publicFeed(c.name).posts[0];
 expect(saved.text).toBe('Schedule\nBring your laptop');expect(saved.richText[0].runs[0].bold).toBe(true);expect(saved.richText[1].runs[0].italic).toBe(true);
 expect(saved.imageUrl).toBe('');expect(saved.pinned).toBe(true);expect(saved.status).toBe('approved');
 expect(c.wall.storageUsage(c.id).eventBytes).toBe(0);
 expect(()=>c.wall.action(c.session,c.name,edit,media)).toThrow('changed');
 c.wall.action(c.session,c.name,{...edit,revision:saved.revision,removeImage:false},media);
 expect(c.wall.publicFeed(c.name).posts[0].imageUrl).toContain('/media/');
 expect(c.wall.media(c.session,c.name,p.id).data).toEqual(media.data);
});

test('schema 12 migration keeps existing wall content, media, sessions and moderation',async()=>{
 const c=await setup();let p=c.wall.submit(c.name,{text:'Existing post'},media);p=action(c,p,'approve');p=action(c,p,'pin');
 const before=c.wall.moderationFeed(c.session,c.name).posts;
 c.store.db.exec('ALTER TABLE wall_posts DROP COLUMN rich_text; PRAGMA user_version=12;');c.store.close();
 const reopened=new SqliteStore(c.filename);stores.push(reopened);const wall=new WallStore(reopened);
 expect(reopened.db.query('PRAGMA user_version').get().user_version).toBe(15);
 expect(wall.moderationFeed(c.session,c.name).posts).toEqual(before);
 expect(wall.media(c.session,c.name,p.id).data).toEqual(media.data);
});
