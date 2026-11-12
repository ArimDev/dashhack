import {test,expect} from 'bun:test';
import {wallTextLinks} from '../../src/shared/wallLinks.js';

test('wall links preserve text while recognizing Unicode hashtags and safe URLs',()=>{
 const text='Hello #atthack #žáci https://example.org/info. <script>alert(1)</script> javascript:alert(2)';
 const tokens=wallTextLinks(text,'x');
 expect(tokens.map(token=>token.text).join('')).toBe(text);
 expect(tokens.filter(token=>token.href).map(token=>token.href)).toEqual(['https://x.com/hashtag/atthack','https://x.com/hashtag/%C5%BE%C3%A1ci','https://example.org/info']);
 expect(wallTextLinks('#hackathon','instagram')[0].href).toBe('https://www.instagram.com/explore/tags/hackathon/');
 expect(wallTextLinks('https://example.org/page#fragment')[0].href).toBe('https://example.org/page#fragment');
 expect(wallTextLinks('https://user:secret@example.org/').some(token=>token.href)).toBe(false);
 expect(wallTextLinks('word#inside').some(token=>token.href)).toBe(false);
});
