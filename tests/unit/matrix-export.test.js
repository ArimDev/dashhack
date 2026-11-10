import {test,expect} from 'bun:test';
import template from '../../src/public/templates/startup-matrix.json';
import {matrixWorkbookParts,matrixExportXlsx} from '../../src/app/utils/startupMatrixXlsx.js';
import {matrixAnswerError,matrixAnswerFontSize} from '../../src/shared/startupMatrix.js';
const keys=['problem','solution','advantages','market','risks','businessModel','clients','competition','team','goToMarket'];
const value=text=>[{type:'paragraph',runs:[{text,bold:true,italic:true}]}];
function cell(xml,address){return xml.match(new RegExp(`<c r="${address}"[^>]*>([\\s\\S]*?)<\\/c>`))[1];}
test('Excel keeps questions and answers in separate colored cells on five rows and one landscape page per team',()=>{
 const team={name:'Tým <A>',startupMatrix:Object.fromEntries(keys.map(key=>[key,value('Odpověď '+key)])),matrixMentorId:'mentor'};
 const files=matrixWorkbookParts(template,'AT&T Hackathon',[team,{name:'Prázdný',startupMatrix:{}}],[{id:'mentor',name:'Mentor & Test'}]);
 const sheet=files['xl/worksheets/sheet1.xml'];
 keys.forEach((key,i)=>{const col=String.fromCharCode(65+i%5),row=i<5?2:4,source=col+(i<5?2:3);expect(cell(sheet,col+row)).toContain(template.cells[source]);expect(cell(sheet,col+row)).not.toContain('Odpověď '+key);expect(cell(sheet,col+(row+1))).toContain('Odpověď '+key);expect(cell(sheet,col+(row+1))).not.toContain(template.cells[source]);});
 expect(sheet).toContain('dimension ref="A1:E5"');expect(sheet).toContain('mergeCell ref="A1:E1"');expect(sheet).toContain('ht="160"');expect(sheet).toContain('orientation="landscape" fitToWidth="1" fitToHeight="1"');expect(sheet).toContain('Tým &lt;A&gt;');expect(sheet).toContain('<b/><i/>');expect(sheet).toContain('AT&amp;&amp;T Hackathon');expect(sheet).toContain('Mentor &amp;&amp; Test');expect(files['xl/styles.xml']).toBe(template.files['xl/styles.xml'].text);
 expect(files['xl/media/image1.jpeg'].length).toBe(21342);expect(files['xl/worksheets/_rels/sheet2.xml.rels']).toContain('drawing2.xml');expect(files['xl/worksheets/sheet2.xml']).toContain('Bez odpovědi.');expect(files['xl/worksheets/sheet2.xml']).toContain('tabSelected="0"');expect(files['xl/workbook.xml']).toContain('$A$1:$E$5');expect(Object.keys(files)).not.toContain('docProps/core.xml');
});
test('Excel rejects oversized or unprintable legacy answers without truncation or continuation, uses smaller font only when needed',()=>{
 const text='Ověřujeme potřeby zákazníků a připravujeme prototyp. '.repeat(12).slice(0,600);
 expect(matrixAnswerError(value(text))).toBe('');expect(matrixAnswerFontSize(value(text))).toBeLessThan(9);expect(matrixAnswerFontSize(value('Krátká odpověď'))).toBe(9);
 const files=matrixWorkbookParts(template,'Event',[{name:'A/B:*?[]',startupMatrix:{problem:value(text),solution:value('=HYPERLINK("bad") <script>')}},{name:'A/B:*?[]',startupMatrix:{}}]);
 expect(files['xl/workbook.xml']).toContain('(2)');expect(files['xl/workbook.xml']).not.toContain('name="A/B');expect(Object.keys(files).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k))).toHaveLength(2);
 expect(cell(files['xl/worksheets/sheet1.xml'],'A3')).toContain(text);expect(cell(files['xl/worksheets/sheet1.xml'],'B3')).toContain('=HYPERLINK(&quot;bad&quot;) &lt;script&gt;');expect(files['xl/worksheets/sheet1.xml']).not.toContain('<f>');
 expect(()=>matrixWorkbookParts(template,'Event',[{name:'Legacy',startupMatrix:{problem:value('x'.repeat(601))}}])).toThrow('600');expect(matrixAnswerError(value(('x\n').repeat(30)))).toContain('řádků');
});
test('workbook is a complete ZIP package with central directory and literal worksheets',()=>{
 const bytes=matrixExportXlsx(template,'Event',[{name:'505',startupMatrix:{}}]),view=new DataView(bytes.buffer);
 expect(view.getUint32(0,true)).toBe(0x04034b50);expect(view.getUint32(bytes.length-22,true)).toBe(0x06054b50);
 const entries=view.getUint16(bytes.length-12,true),directory=view.getUint32(bytes.length-6,true);expect(entries).toBe(Object.keys(matrixWorkbookParts(template,'Event',[{name:'505',startupMatrix:{}}])).length);expect(view.getUint32(directory,true)).toBe(0x02014b50);
 expect(new TextDecoder().decode(bytes)).toContain('[Content_Types].xml');
});
