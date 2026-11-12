import {test,expect} from 'bun:test';
import {matrixExportHtml} from '../../src/app/utils/startupMatrixHtml.js';
import {STARTUP_MATRIX_FIELDS,matrixCompletedCount,matrixQuestion} from '../../src/shared/startupMatrix.js';
const answer=text=>[{type:'paragraph',runs:[{text,bold:true,italic:true}]}];
test('matrix completion excludes empty answers and default questions',()=>{
    expect(matrixCompletedCount({})).toBe(0);
    expect(matrixCompletedCount({startupMatrix:{problem:answer('  '),solution:matrixQuestion(STARTUP_MATRIX_FIELDS[1])}})).toBe(0);
    expect(matrixCompletedCount({startupMatrix:Object.fromEntries(STARTUP_MATRIX_FIELDS.map(f=>[f.key,answer('Odpověď')]))})).toBe(10);
});
test('HTML export is a self-contained escaped browser document with all teams and formatted answers',()=>{
    const html=matrixExportHtml('Event <script>alert(1)</script>',[{name:'Tým <A>',matrixMentorId:'m',startupMatrix:{problem:answer('<img src=x onerror=alert(1)> & text')}},{name:'Prázdný'}],[{id:'m',name:'Mentor <B>'}]);
    expect(html).toStartWith('<!doctype html>');expect(html).toContain('charset="utf-8"');
    expect(html).toContain('Tým &lt;A&gt;');expect(html).toContain('Mentor &lt;B&gt;');expect(html).toContain('<em><strong>&lt;img src=x onerror=alert(1)&gt; &amp; text</strong></em>');
    expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).not.toContain('https://');
    expect(html.match(/<article>/g)).toHaveLength(2);expect(html.match(/<section>/g)).toHaveLength(20);
    expect(html).toContain('Rozpracovaná · 1/10');expect(html).toContain('Nevyplněná · 0/10');expect(html).toContain('Bez odpovědi.');
    expect(html).toContain('@media print');expect(html).toContain('default-src');
});
