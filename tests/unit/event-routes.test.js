import {test,expect} from 'bun:test';
import {legacyEventRedirect} from '../../src/shared/eventRoutes.js';
test('former event URLs preserve wall, upload, dashboard and API paths',()=>{
    for(const [from,to] of [
        ['/Student%20Hackathon%20Demo/wall','/ATT%20Hackathon%20Junior%202026/wall'],
        ['/Student%20Hackathon%20Demo/wall/upload','/ATT%20Hackathon%20Junior%202026/wall/upload'],
        ['/app/Student%20Hackathon%20Demo/teams','/app/ATT%20Hackathon%20Junior%202026/teams'],
        ['/api/wall/Student%20Hackathon%20Demo/posts','/api/wall/ATT%20Hackathon%20Junior%202026/posts'],
        ['/api/event/Student%20Hackathon%20Demo','/api/event/ATT%20Hackathon%20Junior%202026']
    ])expect(legacyEventRedirect(from)).toBe(to);
    for(const path of ['/Other/wall','/join','/api/wall/97c87fe6-f510-4117-9558-1e2380fdaa6a/media/photo','/Student%ZZ/wall','/app/Other/teams'])expect(legacyEventRedirect(path)).toBeNull();
});
