import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
await mkdir('ui-artifacts',{recursive:true});
for(const width of [1440,820,390,320]){
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const r=await page.goto(base+'/resources/');assert.equal(r.status(),200);
 assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.resource-card').count(),4);assert.equal(await page.locator('.book-card').count(),2);
 for(const hash of ['commercial','career','books']){await page.locator(`.resource-jumps a[href="#${hash}"]`).click();assert.equal(new URL(page.url()).hash,'#'+hash);assert(await page.locator('#'+hash).isVisible());}
 const overflow=await page.evaluate(()=>[...document.querySelectorAll('main *,header *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left< -1||r.right>innerWidth+1)}).map(el=>el.className));assert.deepEqual(overflow,[]);
 assert.equal(errors.length,0);await page.screenshot({path:`ui-artifacts/resources-${width}.png`,fullPage:true});
 await page.goto(base+'/');assert(await page.locator('.nav-resources').isVisible());await page.locator('.nav-resources').click();assert.equal(new URL(page.url()).pathname,'/resources/');await page.goBack();assert.equal(new URL(page.url()).pathname,'/');await page.goForward();assert.equal(new URL(page.url()).pathname,'/resources/');
 console.log('PASS resources '+width+' / nav, anchors, history, overflow, page errors');await page.close();
}
await browser.close();
