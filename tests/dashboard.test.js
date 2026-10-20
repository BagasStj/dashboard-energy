import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

test('dashboard renders, animates, and its controls work on desktop and mobile', async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173');
    await page.locator('#scene canvas').waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(await page.locator('.dashboard').evaluate(element=>{
      const rect=element.getBoundingClientRect();return [rect.x,rect.y,rect.width,rect.height];
    }),[0,0,1440,1000],'desktop dashboard fills the viewport without outer space');
    assert.equal(await page.evaluate(() => {
      const bounds=document.querySelector('.dashboard').getBoundingClientRect();
      return [...document.querySelectorAll('.metrics .card')].every(card=>card.getBoundingClientRect().bottom<=bounds.bottom);
    }),true,'all metric cards must fit inside the dashboard');
    assert.equal(await page.locator('.weather-row').count(), 7);
    const frameA = await page.locator('#scene canvas').screenshot();
    await page.waitForTimeout(150);
    const frameB = await page.locator('#scene canvas').screenshot();
    assert.notDeepEqual(frameA, frameB, 'wind turbine frames must change');
    await page.screenshot({ path: '/tmp/kinetiq-desktop.png', fullPage: true });
    for (const days of [3,14,7]) { await page.locator(`[data-days="${days}"]`).click(); assert.equal(await page.locator('.weather-row').count(), days); }
    for (const name of ['Assets','Operations','Analytics','Reports']) {
      await page.locator(`[data-view="${name}"]`).click();
      assert.equal(await page.locator('.view-panel').isVisible(), true);
      assert.equal(await page.locator('.metrics').isVisible(), false);
      assert.equal(await page.locator('.plant').isVisible(), false);
      assert.equal(await page.locator('#scene canvas').isVisible(),true,'3D background remains visible on every page');
      assert.ok(await page.locator('.view-panel').evaluate(el=>el.getAnimations().length>0),'page entrance transition is running');
      await page.evaluate(()=>Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
      await page.screenshot({path:`/tmp/kinetiq-${name.toLowerCase()}.png`,fullPage:true});
    }
    const download = page.waitForEvent('download');
    await page.locator('#download-report').click();
    assert.equal((await download).suggestedFilename(), 'kinetiq-demo-summary.csv');
    await page.locator('[data-view="Assets"]').click();
    assert.equal(await page.locator('#asset-body tr').count(),7);
    await page.locator('#asset-search').fill('Solar');
    assert.equal(await page.locator('#asset-body tr').count(),2);
    await page.locator('#asset-status').selectOption('Attention');
    assert.equal(await page.locator('#asset-body tr').count(),1);
    assert.match(await page.locator('#asset-body').innerText(),/Solar Array B/);
    const assetDownload=page.waitForEvent('download');await page.locator('[data-action="export-assets"]').click();
    const assetCSV=await readFile(await (await assetDownload).path(),'utf8');
    assert.match(assetCSV,/SOL-02/);assert.doesNotMatch(assetCSV,/SOL-01/);
    await page.locator('#asset-search').fill('missing <asset>');
    assert.match(await page.locator('#asset-body').innerText(),/No assets match/);
    await page.locator('[data-action="reset-assets"]').click();
    await page.locator('#asset-sort').selectOption('health');
    assert.match(await page.locator('#asset-body tr').first().innerText(),/Solar Array B/);
    await page.locator('#asset-type').selectOption('Wind');assert.equal(await page.locator('#asset-body tr').count(),3);
    await page.locator('#asset-body [data-asset="WND-01"]').first().click();
    assert.match(await page.locator('#dialog-content').innerText(),/North field/);await page.keyboard.press('Escape');
    await page.locator('[data-view="Operations"]').click();
    await page.locator('[data-ack="AL-103"]').click();assert.equal(await page.locator('[data-ack="AL-103"]').isDisabled(),true);
    assert.match(await page.locator('.workspace-feedback').innerText(),/warning remains active/);
    await page.locator('[data-task="WO-2049"]').click();assert.match(await page.locator('#dialog-content').innerText(),/cooling fans/);await page.keyboard.press('Escape');
    await page.locator('[data-progress="WO-2049"]').click();assert.equal(await page.locator('[data-progress="WO-2049"]').innerText(),'Complete →');
    await page.locator('[data-progress="WO-2049"]').click();assert.equal(await page.locator('[data-progress="WO-2049"]').count(),0);
    await page.locator('[data-task-filter="Completed"]').click();assert.equal(await page.locator('.operations-layout .data-table tbody tr').count(),2);
    await page.locator('[data-task-filter="All"]').click();
    const workDownload=page.waitForEvent('download');await page.locator('[data-action="export-work"]').click();assert.match((await workDownload).suggestedFilename(),/work-orders/);
    await page.locator('[data-view="Analytics"]').click();
    const history={};
    for (const selectedPeriod of ['day','30','7']) {
      await page.locator(`[data-period="${selectedPeriod}"]`).click();
      assert.equal(await page.locator('.data-disclosure tbody tr').count(),selectedPeriod==='day'?24:Number(selectedPeriod));
      history[selectedPeriod]=await page.locator('.data-disclosure tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].map(cell=>cell.textContent)));
    }
    assert.deepEqual(history['30'].slice(-7),history['7'],'overlapping dates must have identical generation values');
    const hourlyTotal=history.day.reduce((sum,row)=>sum+Number(row[3].replaceAll(',','')),0);
    assert.equal(Math.round(hourlyTotal*10)/10,Number(history['7'].at(-1)[3].replaceAll(',','')),'daily energy equals the sum of one-hour power samples');
    await page.locator('.data-disclosure summary').click();
    assert.equal(await page.locator('.data-disclosure table').isVisible(),true);
    const generationDownload=page.waitForEvent('download');await page.locator('[data-action="export-analytics"]').click();
    const generationCSV=await readFile(await (await generationDownload).path(),'utf8');assert.match(generationCSV,/Wind \(MWh\)/);assert.equal(generationCSV.split('\r\n').length,8);
    await page.locator('[data-view="Reports"]').click();
    await page.locator('#report-search').fill('not found');assert.match(await page.locator('#report-body').innerText(),/No reports found/);
    await page.locator('[data-action="reset-reports"]').click();
    await page.locator('#report-type').selectOption('assets');assert.equal(await page.locator('#report-body tr').count(),1);
    await page.locator('#report-type').selectOption('All');
    await page.locator('[data-template="generation"]').click();assert.equal(await page.locator('#builder-type').inputValue(),'generation');
    await page.locator('#builder-period').selectOption('30');await page.locator('#report-form button').click();
    assert.equal(await page.locator('#report-body tr').count(),4);assert.match(await page.locator('#report-body tr').first().innerText(),/30 days/);
    await page.locator('#report-body [data-preview]').first().click();assert.match(await page.locator('#dialog-content').innerText(),/30 records/);await page.keyboard.press('Escape');
    const reportDownload=page.waitForEvent('download');await page.locator('#report-body [data-download]').first().click();
    assert.equal((await readFile(await (await reportDownload).path(),'utf8')).split('\r\n').length,31);
    await page.locator('[data-template="maintenance"]').click();await page.locator('#report-form button').click();
    await page.locator('[data-view="Operations"]').click();assert.equal(await page.locator('[data-ack="AL-103"]').isDisabled(),true);
    for (const width of [390,768]) {
      await page.setViewportSize({width,height:900});
      for (const name of ['Assets','Operations','Analytics','Reports']) {
        await page.locator(`[data-view="${name}"]`).click();
        await page.evaluate(()=>Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} has no page overflow at ${width}`);
        const workspace=await page.locator('.view-panel').boundingBox();assert.ok(workspace.x>=0&&workspace.x+workspace.width<=width);
        const overflow=await page.locator('.view-panel').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,offenders:[...el.querySelectorAll('*')].filter(child=>!child.closest('.table-scroll')&&child.getBoundingClientRect().right>el.getBoundingClientRect().right+1).map(child=>child.className||child.tagName)}));
        assert.ok(overflow.scroll<=overflow.width,`${name} has no workspace overflow: ${JSON.stringify(overflow)}`);
        await page.screenshot({path:`/tmp/kinetiq-${name.toLowerCase()}-${width}.png`,fullPage:true});
        await page.locator('.view-panel').evaluate(el=>el.scrollTop=el.scrollHeight);
        await page.screenshot({path:`/tmp/kinetiq-${name.toLowerCase()}-${width}-bottom.png`,fullPage:true});
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('.brand').click();
    assert.equal(await page.locator('.metrics').isVisible(), true);
    for (const selector of ['notifications','profile','solar','capture','health','performance','weather','settings']) {
      await page.locator(`[data-dialog="${selector}"]`).first().click();
      assert.equal(await page.locator('dialog').isVisible(), true);
      if(selector==='settings') { await page.locator('#animate').uncheck(); await page.locator('#speed').fill('1.5'); await page.locator('#animate').check(); }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').isVisible(), false);
    }
    await page.locator('.solar-card [data-dialog="solar"]').click();await page.locator('.dialog-close').click();
    await page.locator('#rotate').click();
    await page.locator('#expand').click();assert.equal(await page.locator('.metrics').isVisible(), false);
    await page.locator('#expand').click();assert.equal(await page.locator('.metrics').isVisible(), true);
    for (const width of [390,768,1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no overflow at ${width}px`);
      assert.equal(await page.locator('.weather').isVisible(),true);
      assert.equal(await page.evaluate(()=>{
        const dashboard=document.querySelector('.dashboard').getBoundingClientRect();
        return [...document.querySelectorAll('.metrics .card')].every(card=>card.getBoundingClientRect().bottom<=dashboard.bottom);
      }),true,`cards fit at ${width}px`);
      await page.screenshot({path:`/tmp/kinetiq-${width}.png`,fullPage:true});
    }
    assert.deepEqual(errors, []);
    await page.emulateMedia({ reducedMotion:'reduce' });await page.reload();
    await page.locator('[data-view="Assets"]').click();
    assert.equal(await page.locator('.view-panel').evaluate(el=>el.getAnimations().length),0,'reduced motion disables page transitions');
    await page.locator('[data-view="Overview"]').click();
    await page.locator('[data-dialog="settings"]').click();assert.equal(await page.locator('#animate').isChecked(),false);
  } finally { await browser.close(); }
});
