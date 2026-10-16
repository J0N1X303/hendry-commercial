import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({headless:true});
await mkdir('ui-artifacts',{recursive:true});
const cases = [
  {name:'desktop1440',width:1440,height:900},
  {name:'desktop1280',width:1280,height:800},
  {name:'tablet820',width:820,height:1180},
  {name:'iphone390',width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2},
  {name:'iphone375',width:375,height:812,isMobile:true,hasTouch:true,deviceScaleFactor:2},
  {name:'small320',width:320,height:700,isMobile:true,hasTouch:true,deviceScaleFactor:2}
];
let failed=false;
for (const config of cases) {
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:!!config.isMobile,hasTouch:!!config.hasTouch,deviceScaleFactor:config.deviceScaleFactor || 1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    const response=await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200,'Home must load');
    await page.locator('[data-engine-tab="sell"]').click();
    assert.equal(await page.locator('[data-stage-number]').innerText(),'02 / SELL','SELL selects live panel');
    assert.match(await page.locator('[data-stage-title]').innerText(),/progress/i);
    assert.equal(await page.locator('[data-engine-tab="sell"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('[data-engine-tab="buy"]').getAttribute('aria-pressed'),'false');
    await page.locator('[data-engine-tab="build"]').click();
    assert.equal(await page.locator('[data-stage-number]').innerText(),'03 / BUILD');
    await page.locator('[data-engine-tab="buy"]').click();
    assert.equal(await page.locator('[data-stage-number]').innerText(),'01 / BUY');
    await page.locator('[data-framework-toggle]').click();
    assert.equal(await page.locator('[data-framework-toggle]').getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('[data-framework-detail]').isVisible(),true,'Framework expands');
    await page.locator('[data-pressure="forecast"]').click();
    assert.match(await page.locator('[data-pressure-question]').innerText(),/buyer action/i,'Pressure test reacts');
    await page.locator('[data-framework-toggle]').click();
    assert.equal(await page.locator('[data-framework-detail]').isVisible(),false,'Framework collapses');
    assert.equal(await page.locator('.experience-rails').count(),2,'Both moving strips retained');
    assert.equal(await page.locator('.timeline-item').count(),4,'Four commercial outcomes');
    assert((await page.locator('.project-card').count())>=4,'Projects scale through cards');
    assert.equal(await page.locator('a[href="/check"]').count(),1,'Buyer Readiness linked');
    if (new Date() < new Date('2026-11-01T00:00:00Z')) {
      assert.equal(await page.getByText('Cold Call Cara').count(),0,'Cara must not launch early');
    }
    await page.locator('[data-project-track]').scrollIntoViewIfNeeded();
    const track=page.locator('[data-project-track]');
    const max=await track.evaluate(el=>el.scrollWidth-el.clientWidth);
    assert(max>30,'Gallery must overflow for scroll interaction');
    assert.equal(await page.locator('[data-project-prev]').isDisabled(),true,'Back arrow disabled at start');
    await page.locator('[data-project-next]').click();
    await page.waitForTimeout(650);
    const scrolled=await track.evaluate(el=>el.scrollLeft);
    assert(scrolled>20,'Next arrow advances cards');
    await page.locator('[data-project-prev]').click();
    await page.waitForTimeout(650);
    assert((await track.evaluate(el=>el.scrollLeft))<scrolled,'Previous arrow reverses');
    await page.locator('[data-open-cv]').click();
    assert.equal(await page.locator('[data-cv-dialog]').isVisible(),true,'CV dialog opens');
    await page.locator('[data-close-cv]').click();
    assert.equal(await page.locator('[data-cv-dialog]').isVisible(),false,'CV dialog closes');
    const widths=await page.evaluate(()=>{
      const s=['.hero','.studio-grid','.studio-stage','.commercial-summary','.about','.experience','.ventures-studio','.contact'];
      return s.map(selector=>{
        const r=document.querySelector(selector).getBoundingClientRect();
        return {selector,left:r.left,right:r.right};
      });
    });
    for(const item of widths)assert(item.left>=-2 && item.right<=config.width+2,'Overflow '+JSON.stringify(item));
    assert.equal(errors.length,0,'JavaScript errors: '+errors.join('; '));
    await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible')));
    await page.screenshot({path:'ui-artifacts/'+config.name+'.png',fullPage:true,animations:'disabled'});
    console.log('PASS '+config.name+' / stage, pressure, gallery, CV, bounds');
  } catch (e) {
    failed=true;
    console.error('FAIL '+config.name+': '+(e.stack||e));
    await page.screenshot({path:'ui-artifacts/failed-'+config.name+'.png',fullPage:true}).catch(()=>{});
  } finally {await context.close();}
}
await browser.close();
if(failed)process.exitCode=1;