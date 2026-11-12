import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {STARTUP_MATRIX_FIELDS} from '../../src/shared/startupMatrix.js';

test('matrix overview, offline HTML, direct links, phone layout and typed deletion',async({page,browser})=>{
    const username='Matrix workspace '+randomUUID(),password='password123';
    const post=async(url,data)=>(await(await page.request.post(url,{data})).json());
    expect((await post('/api/auth/create',{username,password})).status).toBe(200);
    expect((await post('/api/auth/login',{username,password})).status).toBe(200);
    for(const teamName of ['Empty <team>','Partial','Complete'])expect((await post('/api/team/add',{username,teamName,teamColor:'#3081e0'})).status).toBe(200);
    const event=(await(await page.request.get(`/api/event/${encodeURIComponent(username)}`)).json()).data;
    for(const team of event.teams.filter(t=>t.name!=='Empty <team>')){
        const fields=team.name==='Complete'?STARTUP_MATRIX_FIELDS:STARTUP_MATRIX_FIELDS.slice(0,1);
        const answers=Object.fromEntries(fields.map(f=>[f.key,[{type:'paragraph',runs:[{text:'Česká odpověď <script>alert(1)</script>',bold:true}]}]]));
        expect((await(await page.request.patch('/api/team/matrix',{data:{username,teamId:team._id,revision:team.revision,answers}})).json()).status).toBe(200);
    }
    const path=`/app/${encodeURIComponent(username)}`;await page.goto(path+'/teams');
    await expect(page.getByTestId('startup-matrix')).toHaveCount(0);
    const card=page.getByTestId('team-card-Partial');await card.getByText('Startupová matice',{exact:true}).click();
    await expect(page).toHaveURL(/\/matice#matrix-/);
    await expect(page.getByText('Hotové: 1',{exact:true})).toBeVisible();await expect(page.getByText('Rozpracované: 1',{exact:true})).toBeVisible();await expect(page.getByText('Nevyplněné: 1',{exact:true})).toBeVisible();
    const matrix=page.getByTestId('matrix-team-Partial');await expect(matrix.getByTestId('matrix-field-problem')).toContainText('Česká odpověď <script>');
    await page.getByLabel('Stav matice').selectOption('incomplete');await expect(page.getByTestId('matrix-team-Complete')).toBeHidden();await expect(page.getByTestId('matrix-team-Empty <team>')).toBeVisible();
    await matrix.getByRole('button',{name:'Upravit matici'}).click();await matrix.getByRole('textbox',{name:'PROBLÉM',exact:true}).fill('Retained draft');
    await page.getByLabel('Hledat tým').fill('Empty');await page.getByLabel('Hledat tým').clear();await expect(matrix.getByRole('textbox',{name:'PROBLÉM',exact:true})).toHaveText('Retained draft');
    page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('navigation',{name:'Event pages'}).getByRole('link',{name:'Teams',exact:true}).click();await expect(page).toHaveURL(/\/matice/);
    await matrix.getByRole('button',{name:'Zrušit',exact:true}).click();
    const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export všech matic (.html)',exact:true}).click();
    const file=await downloaded;expect(file.suggestedFilename()).toMatch(/\.html$/);const html=await readFile(await file.path(),'utf8');expect(html).toContain('Empty &lt;team&gt;');expect(html).toContain('Complete');expect(html).not.toContain('<script>');
    const offline=await browser.newPage();await offline.route('**/*',route=>route.abort());await offline.setContent(html);await expect(offline.getByRole('heading',{name:'Complete',exact:true})).toBeVisible();await offline.close();
    await page.setViewportSize({width:390,height:844});await expect(matrix).toBeVisible();expect(await page.locator('#dashboard-content').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    await page.goto(path+'/teams');const empty=page.getByTestId('team-card-Empty <team>');await empty.getByRole('button',{name:'Delete team',exact:true}).click();
    const dialog=page.getByRole('dialog'),remove=dialog.getByRole('button',{name:'Delete team permanently'});await expect(remove).toBeDisabled();await dialog.getByLabel('Type the team name to confirm').fill('Wrong');await expect(remove).toBeDisabled();
    await dialog.getByLabel('Type the team name to confirm').fill('Empty <team>');await expect(remove).toBeEnabled();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(empty).toBeVisible();
    await empty.getByRole('button',{name:'Delete team',exact:true}).click();await dialog.getByLabel('Type the team name to confirm').fill('Empty <team>');await remove.click();await expect(empty).toHaveCount(0);
    const guest=await browser.newContext({ignoreHTTPSErrors:true});const view=await guest.newPage();await view.goto(new URL(path+'/matice',page.url()).href);await view.getByTestId('matrix-team-Complete').getByRole('button',{name:/Complete/}).click();await expect(view.getByRole('button',{name:'Upravit matici'})).toHaveCount(0);await expect(view.getByTestId('matrix-field-problem')).toContainText('Česká odpověď');await guest.close();
});
