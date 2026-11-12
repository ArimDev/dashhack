import { Database } from 'bun:sqlite';
import { deflateSync } from 'node:zlib';

const EVENT = 'Student Hackathon Demo';
// Small original PNG illustrations, generated without dependencies or external assets.
function demoImage(accent) {
    const width=480,height=270,raw=Buffer.alloc(height*(1+width*3));
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
        let rgb = [15,23,42];
        if(x>24 && x<456 && y>24 && y<65) rgb=accent;
        if(x>24 && x<180 && y>90 && y<242) rgb=[30,41,59];
        if(x>202 && x<440 && y>90 && y<242) rgb=[30,41,59];
        if(x>36 && x<168 && y>110 && y<120) rgb=accent;
        if(x>36 && x<145 && y>142 && y<151) rgb=[148,163,184];
        if(x>36 && x<158 && y>170 && y<179) rgb=[100,116,139];
        if(x>216 && x<425 && y>110 && y<225 && ((x-216)%55<37) && y>215-((Math.floor((x-216)/55)+1)*24)) rgb=accent;
        const offset=y*(1+width*3)+1+x*3;raw.set(rgb,offset);
    }
    function chunk(type,data) {
        const contents=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;
        for(const byte of contents) { crc^=byte;for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
        const length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE((crc^0xffffffff)>>>0);
        return Buffer.concat([length,contents,checksum]);
    }
    const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
    return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const POSTS = [
    { author:'Demo – pořadatelé',text:'DEMO: Vítejte na AT&T Hackathon Junior 2026! Patnáct studentských týmů, spousta nápadů a společná chuť tvořit. Toto je ukázkový příspěvek, nikoli zpráva ze skutečného průběhu akce.',status:'approved',pinned:1,image:[48,129,224] },
    { author:'Demo – Pixeloví průkopníci',text:'DEMO: První prototyp našeho projektu je hotový. Ukázkový obrázek představuje přehled úkolů a výsledků; nejde o fotografii skutečného týmu.',status:'approved',pinned:1,image:[34,197,94] },
    { author:'Demo – mentorský tým',text:'DEMO: Potřebujete pomoci s návrhem, kódem nebo prezentací? Přidejte týmu help request do Kanbanu a napište, co už jste vyzkoušeli.',status:'approved' },
    { author:'Demo – studentský tým',handle:'@ukazkovy_tym',platform:'x',text:'DEMO (nejde o skutečný tweet): Repozitář máme připravený, první změny jsou odeslané a můžeme začít stavět! #HackathonJunior2026',status:'approved' },
    { author:'Demo – tým s nápadem',text:'DEMO: Ve Startupové matici jsme popsali problém, cílové zákazníky a hlavní konkurenci. Mentor nám pomohl zpřesnit, čím je naše řešení originální.',status:'approved' },
    { author:'Demo – prezentační tým',text:'DEMO: Zkoušíme krátkou prezentaci: jaký problém řešíme, jak funguje prototyp a co bychom vyvinuli dál. Držte nám palce!',status:'approved' },
    { author:'Demo – čeká na schválení',text:'DEMO: Ukázkový obrázkový příspěvek čekající na schválení mentorem. Veřejná zeď ani anonymní návštěvníci zatím obrázek neuvidí.',status:'pending',image:[168,85,247] },
    { author:'Demo – další příspěvek',handle:'@demo_mentor',platform:'x',text:'DEMO (nejde o skutečný tweet): Ukázkový příspěvek ve frontě. Schvalte jej v moderaci a poté se objeví na veřejné zdi.',status:'pending' },
    { author:'Demo – skrytý příspěvek',text:'DEMO: Tento schválený příspěvek je záměrně skrytý. Slouží k vyzkoušení akcí Zobrazit, Připnout a Smazat.',status:'approved',hidden:1 },
    { author:'Demo – zamítnutý příspěvek',text:'DEMO: Záměrně zamítnutá ukázka pro vyzkoušení návratu do fronty nebo archivace.',status:'rejected',hidden:1 },
];

export function seedDemoWall(filename,{ apply=false, now=Date.now() }={}) {
    const db=new Database(filename,{ create:false,readwrite:true,strict:true });
    try {
        db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
        if(![8,9,10,11,12,13].includes(db.query('PRAGMA user_version').get().user_version)) throw new Error('Seed requires a supported deployed schema (8–13); it never migrates a database.');
        const event=db.query('SELECT id FROM events WHERE name=?').get(EVENT);
        if(!event) throw new Error('Existing Student Hackathon Demo event not found; no event or credentials will be created.');
        const teams=db.query('SELECT COUNT(*) AS n FROM teams WHERE event_id=?').get(event.id).n;
        const notes=db.query('SELECT COUNT(*) AS n FROM notes JOIN teams ON teams.id=notes.team_id WHERE teams.event_id=?').get(event.id).n;
        if(teams<15 || notes<45) throw new Error('Expected existing 15-team/45-note demo; refusing to seed another database.');
        const ids=POSTS.map((_,i)=>`demo-wall-2026-${String(i+1).padStart(2,'0')}`);
        const missing=ids.filter(id=>!db.query('SELECT 1 FROM wall_posts WHERE event_id=? AND id=?').get(event.id,id));
        if(!apply) return { event:EVENT,apply:false,teams,notes,wouldAdd:missing.length };
        return db.transaction(()=>{
            const wallCreated=db.query(`INSERT OR IGNORE INTO wall_settings(event_id,settings) VALUES(?,?)`).run(event.id,JSON.stringify({enabled:true,publicUploadEnabled:true,moderationMode:'manual'})).changes;
            let added=0;
            POSTS.forEach((post,index)=>{
                const id=ids[index];
                if(db.query('SELECT 1 FROM wall_posts WHERE event_id=? AND id=?').get(event.id,id)) return;
                const imageUrl=post.image ? `/api/wall/${event.id}/media/${id}` : '';
                db.query(`INSERT INTO wall_posts(event_id,id,platform,author_name,handle,text,image_url,video_url,source_url,status,hidden,pinned,created_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(event.id,id,post.platform||'manual',post.author,post.handle||'',post.text,imageUrl,'','',post.status,post.hidden||0,post.pinned||0,new Date(now-index*60000).toISOString());
                if(post.image) db.query('INSERT INTO wall_media(event_id,post_id,mime,data) VALUES(?,?,?,?)').run(event.id,id,'image/png',demoImage(post.image));
                added++;
            });
            if(added || wallCreated) db.query('UPDATE events SET updated_at=? WHERE id=?').run(new Date(now).toISOString(),event.id);
            return { event:EVENT,apply:true,added,skipped:POSTS.length-added,wallEnabled:!!JSON.parse(db.query('SELECT settings FROM wall_settings WHERE event_id=?').get(event.id).settings).enabled,
                posts:db.query(`SELECT status,hidden,COUNT(*) AS count FROM wall_posts WHERE event_id=? AND deleted=0 GROUP BY status,hidden ORDER BY status,hidden`).all(event.id),
                mediaBytes:db.query('SELECT COALESCE(SUM(length(data)),0) AS bytes FROM wall_media WHERE event_id=?').get(event.id).bytes };
        }).immediate();
    } finally { db.close(); }
}
if(import.meta.main) {
    console.log(JSON.stringify(seedDemoWall(process.env.NUXT_SQLITE_PATH||'./.data/dashhack.sqlite',{apply:process.argv.includes('--apply')})));
}
