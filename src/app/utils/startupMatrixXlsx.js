import { STARTUP_MATRIX_FIELDS } from '../../shared/startupMatrix.js';
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE='http://schemas.openxmlformats.org/package/2006/relationships';
const XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const encoder=new TextEncoder();
const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const CELLS=['A2','B2','C2','D2','E2','A3','B3','C3','D3','E3'];
function run(text,bold=false,italic=false,size=12){return `<r><rPr>${bold?'<b/>':''}${italic?'<i/>':''}<sz val="${size}"/><color theme="1"/><rFont val="Calibri"/></rPr><t xml:space="preserve">${xml(text)}</t></r>`;}
function replaceCell(sheet,address,content){
    const pattern=new RegExp(`(<c\\b[^>]* r="${address}"[^>]*>)[\\s\\S]*?<\\/c>`);
    if(!pattern.test(sheet))throw new Error(`Šablona neobsahuje buňku ${address}.`);
    return sheet.replace(pattern,(_,tag)=>tag.replace(/ t="[^"]*"/,'').replace(/>$/,' t="inlineStr">')+`<is>${content}</is></c>`);
}
function answerRuns(blocks=[]){
    const runs=[];
    blocks.forEach((block,index)=>{
        if(index)runs.push({text:'\n'});
        if(block.type==='bullet')runs.push({text:'• '});
        for(const part of block.runs)runs.push(part);
    });
    return runs;
}
// Excel cells hold at most 32,767 UTF-16 units. Preserve oversized answers in
// continuation sheets in 30,000-unit chunks, without splitting surrogate pairs.
function chunks(runs){
    const result=[[]];let size=0;
    for(const part of runs){let text='';for(const char of part.text){if(size+char.length>30000){if(text)result.at(-1).push({...part,text});result.push([]);size=0;text='';}text+=char;size+=char.length;}if(text)result.at(-1).push({...part,text});}
    return result;
}
function shortName(value,limit){let text='';for(const char of value){if(text.length+char.length>limit)break;text+=char;}return text.replace(/^'+|'+$/g,'')||'Tým';}
function sheetName(value,used){
    const base=String(value).replace(/[\\/?*\[\]:\u0000-\u001F]/g,' ').replace(/^'+|'+$/g,'').trim()||'Tým';
    let name=shortName(base,31),index=2;
    while(used.has(name.toLowerCase())){const suffix=` (${index++})`;name=shortName(base,31-suffix.length)+suffix;}
    used.add(name.toLowerCase());return name;
}
function continuationSheet(label,parts){
    return XML+`<worksheet xmlns="${NS}"><cols><col min="1" max="1" width="120" customWidth="1"/></cols><sheetData><row r="1"><c r="A1" t="inlineStr"><is>${run(label,true)}</is></c></row>${parts.map((part,index)=>`<row r="${index+2}" ht="409" customHeight="1"><c r="A${index+2}" s="1" t="inlineStr"><is>${part.map(p=>run(p.text,p.bold,p.italic)).join('')}</is></c></row>`).join('')}</sheetData></worksheet>`;
}
export function matrixWorkbookParts(template,eventName,teams,mentors=[]){
    const files=Object.fromEntries(Object.entries(template.files).map(([name,value])=>[name,value.text??Uint8Array.from(atob(value.base64),c=>c.charCodeAt(0))]));
    const used=new Set(),sheets=[];
    const addSheet=(name,content,drawing)=>{const index=sheets.length+1;sheets.push({name,index});files[`xl/worksheets/sheet${index}.xml`]=index===1?content:content.replace('tabSelected="1"','tabSelected="0"');
        if(drawing){files[`xl/drawings/drawing${index}.xml`]=template.files['xl/drawings/drawing1.xml'].text;files[`xl/drawings/_rels/drawing${index}.xml.rels`]=template.files['xl/drawings/_rels/drawing1.xml.rels'].text;files[`xl/worksheets/_rels/sheet${index}.xml.rels`]=XML+`<Relationships xmlns="${PACKAGE}"><Relationship Id="rId2" Type="${REL}/drawing" Target="../drawings/drawing${index}.xml"/></Relationships>`;}
    };
    for(const team of teams){
        const name=sheetName(team.name,used),overflow=[];
        let sheet=replaceCell(template.sheet,'A1',run(`Startupová matice – ${team.name}`,true,false,20));
        STARTUP_MATRIX_FIELDS.forEach((field,index)=>{
            const blocks=team.startupMatrix?.[field.key]||[],hasAnswer=blocks.some(b=>b.runs.some(r=>r.text.trim())),runs=hasAnswer?answerRuns(blocks):[{text:'Bez odpovědi.',italic:true}];
            const length=runs.reduce((n,r)=>n+r.text.length,0)+field.prompt.length+field.label.length+16;
            let content=runs;
            if(length>32000){const extraName=sheetName(`${team.name} ${field.label}`,used);overflow.push({name:extraName,label:`${team.name} – ${field.label}`,parts:chunks(runs)});content=[{text:`Celá odpověď: list ${extraName}`,bold:true}];}
            sheet=replaceCell(sheet,CELLS[index],template.cells[CELLS[index]]+run('\n\n')+content.map(p=>run(p.text,p.bold,p.italic)).join(''));
        });
        const mentor=mentors.find(m=>m.id===team.matrixMentorId)?.name;
        const footer=[eventName.slice(0,100),mentor?`Zpracoval/a: ${mentor}`:''].filter(Boolean).join(' · ').replace(/&/g,'&&');
        sheet=sheet.replace('<drawing ',`<headerFooter><oddFooter>${xml('&C'+footer)}</oddFooter></headerFooter><drawing `);
        addSheet(name,sheet,true);for(const extra of overflow)addSheet(extra.name,continuationSheet(extra.label,extra.parts),false);
    }
    files['xl/workbook.xml']=XML+`<workbook xmlns="${NS}" xmlns:r="${REL}"><bookViews><workbookView/></bookViews><sheets>${sheets.map(s=>`<sheet name="${xml(s.name)}" sheetId="${s.index}" r:id="rId${s.index}"/>`).join('')}</sheets></workbook>`;
    files['xl/_rels/workbook.xml.rels']=XML+`<Relationships xmlns="${PACKAGE}">${sheets.map(s=>`<Relationship Id="rId${s.index}" Type="${REL}/worksheet" Target="worksheets/sheet${s.index}.xml"/>`).join('')}<Relationship Id="styles" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="theme" Type="${REL}/theme" Target="theme/theme1.xml"/></Relationships>`;
    files['_rels/.rels']=XML+`<Relationships xmlns="${PACKAGE}"><Relationship Id="workbook" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const overrides=[['/xl/workbook.xml','spreadsheetml.sheet.main+xml'],['/xl/styles.xml','spreadsheetml.styles+xml'],['/xl/theme/theme1.xml','theme+xml'],...sheets.map(s=>[`/xl/worksheets/sheet${s.index}.xml`,'spreadsheetml.worksheet+xml']),...Object.keys(files).filter(n=>/^xl\/drawings\/drawing\d+\.xml$/.test(n)).map(n=>['/'+n,'drawing+xml'])];
    files['[Content_Types].xml']=XML+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="jpeg" ContentType="image/jpeg"/>${overrides.map(([name,type])=>`<Override PartName="${name}" ContentType="application/vnd.openxmlformats-officedocument.${type}"/>`).join('')}</Types>`;
    return files;
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
// A small STORE-only ZIP packager for these trusted template parts. No generic
// spreadsheet engine, decompression dependency or server-side export process.
export function zipWorkbook(files){
    const local=[],central=[];let offset=0,centralSize=0;
    for(const [path,value] of Object.entries(files)){
        const name=encoder.encode(path),data=typeof value==='string'?encoder.encode(value):value,crc=crc32(data);
        const header=new Uint8Array(30+name.length),h=new DataView(header.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);header.set(name,30);local.push(header,data);
        const entry=new Uint8Array(46+name.length),c=new DataView(entry.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);entry.set(name,46);central.push(entry);centralSize+=entry.length;offset+=header.length+data.length;
    }
    const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
    const result=new Uint8Array(offset+centralSize+22);let position=0;for(const part of [...local,...central,end]){result.set(part,position);position+=part.length;}return result;
}
export function matrixExportXlsx(template,eventName,teams,mentors=[]){return zipWorkbook(matrixWorkbookParts(template,eventName,teams,mentors));}
