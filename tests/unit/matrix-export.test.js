import {test,expect} from 'bun:test';
import template from '../../src/public/templates/startup-matrix.json';
import {matrixWorkbookParts,matrixExportXlsx} from '../../src/app/utils/startupMatrixXlsx.js';
const fieldKeys=['problem','solution','advantages','market','risks','businessModel','clients','competition','team','goToMarket'];
const cells=['A2','B2','C2','D2','E2','A3','B3','C3','D3','E3'];
const value=text=>[{type:'paragraph',runs:[{text,bold:true,italic:true}]}];
function cell(xml,address){return xml.match(new RegExp(`<c r="${address}"[^>]*>([\\s\\S]*?)<\\/c>`))[1];}
test('Excel matrix matches the supplied five-by-two template, preserves all formatting/logo assets and maps all answers',()=>{
 const team={name:'Tým <A>',startupMatrix:Object.fromEntries(fieldKeys.map(key=>[key,value('Odpověď '+key)])),matrixMentorId:'mentor'};
 const files=matrixWorkbookParts(template,'AT&T Hackathon',[team,{name:'Prázdný',startupMatrix:{}}],[{id:'mentor',name:'Mentor & Test'}]);
 const sheet=files['xl/worksheets/sheet1.xml'];
 cells.forEach((address,index)=>{expect(cell(sheet,address)).toContain(template.cells[address]);expect(cell(sheet,address)).toContain('Odpověď '+fieldKeys[index]);});
 expect(sheet).toContain('mergeCell ref="A1:E1"');expect(sheet).toContain('ht="200"');expect(sheet).toContain('orientation="landscape"');expect(sheet).toContain('Tým &lt;A&gt;');expect(sheet).toContain('<b/><i/>');
 expect(sheet).toContain('AT&amp;&amp;T Hackathon');expect(sheet).toContain('Mentor &amp;&amp; Test');expect(files['xl/styles.xml']).toBe(template.files['xl/styles.xml'].text);
 expect(files['xl/media/image1.jpeg'].length).toBe(21342);expect(files['xl/worksheets/_rels/sheet2.xml.rels']).toContain('drawing2.xml');
 expect(files['xl/worksheets/sheet2.xml']).toContain('Bez odpovědi.');expect(files['xl/worksheets/sheet2.xml']).toContain('tabSelected="0"');expect(files['xl/workbook.xml']).not.toContain('H:\\');expect(Object.keys(files)).not.toContain('docProps/core.xml');
});
test('Excel export uses literal rich strings, unique safe sheet names and continuation sheets without losing long answers',()=>{
 const text='x'.repeat(29999)+'😀'+'y'.repeat(20000);
 const files=matrixWorkbookParts(template,'Event',[{name:'A/B:*?[]',startupMatrix:{problem:value(text),solution:value('=HYPERLINK("bad") <script>')}} ,{name:'A/B:*?[]',startupMatrix:{}}]);
 expect(files['xl/workbook.xml']).toContain('(2)');expect(files['xl/workbook.xml']).not.toContain('name="A/B');
 const sheet=files['xl/worksheets/sheet1.xml'];expect(cell(sheet,'A2')).toContain('Celá odpověď: list');expect(cell(sheet,'B2')).toContain('=HYPERLINK(&quot;bad&quot;) &lt;script&gt;');expect(sheet).not.toContain('<f>');
 const continuation=files['xl/worksheets/sheet2.xml'];
 const textIn=address=>[...cell(continuation,address).matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m=>m[1]).join('');
 expect(textIn('A2')+textIn('A3')).toBe(text);expect(textIn('A2').length).toBeLessThanOrEqual(30000);expect(textIn('A3').startsWith('😀')).toBe(true);
});
test('workbook is a complete ZIP package with central directory and literal worksheets',()=>{
 const bytes=matrixExportXlsx(template,'Event',[{name:'505',startupMatrix:{}}]),view=new DataView(bytes.buffer);
 expect(view.getUint32(0,true)).toBe(0x04034b50);expect(view.getUint32(bytes.length-22,true)).toBe(0x06054b50);
 const entries=view.getUint16(bytes.length-12,true),directory=view.getUint32(bytes.length-6,true);expect(entries).toBe(Object.keys(matrixWorkbookParts(template,'Event',[{name:'505',startupMatrix:{}}])).length);expect(view.getUint32(directory,true)).toBe(0x02014b50);
 expect(new TextDecoder().decode(bytes)).toContain('[Content_Types].xml');expect(new TextDecoder().decode(bytes)).toContain('Startupová matice');
});
