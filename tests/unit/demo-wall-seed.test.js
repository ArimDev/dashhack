import { test, expect } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteStore } from '../../src/server/storage/sqlite.js';
import { WallStore, validateMedia } from '../../src/server/storage/wall.js';
import { seedDemoWall } from '../../scripts/seed-demo-wall.js';

test('Czech demo wall seeding is explicit, isolated and idempotent without replacing existing data',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'dashhack-demo-seed-')),filename=join(dir,'app.sqlite');
    const store=new SqliteStore(filename);
    try {
        const id=await store.createEvent('Student Hackathon Demo','password123'),session=store.createSession(id);
        await store.createEvent('Other event','password123');
        expect(()=>seedDemoWall(filename,{apply:true})).toThrow('15-team/45-note');
        for(let i=0;i<15;i++) {
            const team={teamName:`Tým ${i+1}`,teamColor:'#3081e0'};
            const teamId=store.addTeam(session,'Student Hackathon Demo',team);
            store.editTeam(session,'Student Hackathon Demo',{...team,teamId,revision:0,stickyNotes:[0,1,2].map(n=>({id:`note-${i}-${n}`,content:'Poznámka'}))});
        }
        const before=store.getEvent('Student Hackathon Demo');
        expect(seedDemoWall(filename)).toMatchObject({apply:false,wouldAdd:10});
        expect(store.db.query('SELECT COUNT(*) AS n FROM wall_posts').get().n).toBe(0);
        expect(seedDemoWall(filename,{apply:true})).toMatchObject({added:10,skipped:0,wallEnabled:true});
        const wall=new WallStore(store),publicPosts=wall.publicFeed('Student Hackathon Demo').posts;
        expect(publicPosts).toHaveLength(6);
        expect(publicPosts.every(post=>post.text.startsWith('DEMO'))).toBe(true);
        const feed=wall.moderationFeed(session,'Student Hackathon Demo');
        expect(feed.stats).toEqual({total:10,approved:6,pending:2,rejected:1,hidden:2,pinned:2});
        expect(store.db.query('SELECT COUNT(*) AS n FROM wall_posts WHERE event_id!=?').get(id).n).toBe(0);
        for(const row of store.db.query('SELECT mime,data FROM wall_media').all()) expect(()=>validateMedia(row.data,row.mime)).not.toThrow();
        const after=store.getEvent('Student Hackathon Demo');
        expect(after.teams).toEqual(before.teams);expect(after.settings).toEqual(before.settings);expect(after.mentors).toEqual(before.mentors);
        store.db.query("UPDATE wall_posts SET status='rejected',hidden=1 WHERE event_id=? AND id='demo-wall-2026-01'").run(id);
        wall.updateSettings(session,'Student Hackathon Demo',{enabled:false},0);
        expect(seedDemoWall(filename,{apply:true})).toMatchObject({added:0,skipped:10,wallEnabled:false});
        expect(wall.moderationFeed(session,'Student Hackathon Demo').stats.rejected).toBe(2);
    } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
