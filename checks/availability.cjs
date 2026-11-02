// Run with Playwright available: NODE_PATH=<playwright node_modules> node checks/availability.cjs
// Serve the repo on http://127.0.0.1:8765 first. Optional: CHROME_PATH, BASE_URL.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    for (const width of (process.env.WIDTHS || '1746,1024,768,390,320').split(',').map(Number)) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 761, hasTouch: width < 761 });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8765', { waitUntil: 'domcontentloaded' });
      const showcase = page.locator('#reliability .reliability-showcase');
      await showcase.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.reliability-showcase').classList.contains('is-in-view'));
      const panels = showcase.locator(':scope > figure');
      assert.equal(await panels.count(), 5);
      const box = await showcase.boundingBox();
      assert(box.height >= 230 && box.width > 200, JSON.stringify(box));
      assert(box.x >= 0 && box.x + box.width <= width + 1, 'showcase must fit viewport');
      assert(Math.abs(box.x + box.width - width) < 2, 'image reaches the right edge');
      const sectionBox = await page.locator('#reliability').boundingBox();
      assert(Math.abs(box.y + box.height - sectionBox.y - sectionBox.height) < 2, 'image reaches the bottom edge');
      assert(await panels.first().evaluate(el => getComputedStyle(el).maskImage.includes('availability-crop-')), 'persistent watercolor crop');
      const items = page.locator('#reliability summary');
      const variants = new Set();
      for (let i = 0; i < 5; i++) {
        if (width > 760) await items.nth(i).hover();
        else await items.nth(i).tap();
        const active = showcase.locator(':scope > .is-active');
        assert.equal(await active.count(), 1);
        variants.add(await active.getAttribute('data-mask-variant'));
        assert.equal(await active.getAttribute('data-showcase-panel'), ['equipment', 'maintenance', 'critical', 'response', 'performance'][i]);
        const imageBox = await active.locator('img').boundingBox();
        const currentBox = await showcase.boundingBox();
        assert(Math.abs(imageBox.height - currentBox.height) < 1 && Math.abs(imageBox.width - currentBox.width) < 1, `image fills canvas at ${width}: ${JSON.stringify(imageBox)} vs ${JSON.stringify(box)}`);
      }
      assert(variants.size > 1, 'reveal variants change across selections');
      await items.nth(1).focus();
      assert.equal(await showcase.getAttribute('data-active-showcase'), 'maintenance');
      await showcase.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.reliability-showcase').classList.contains('is-in-view'));
      await page.waitForTimeout(950);
      await showcase.locator('.is-active img').evaluate(img => Promise.race([img.decode(), new Promise((_, reject) => setTimeout(() => reject(new Error('Image decode timed out')), 15000))]));
      assert.match(await showcase.locator('.is-active img').evaluate(el => getComputedStyle(el).maskPosition), /^100% /);
      if (process.env.SCREENSHOT_DIR && [1746, 390].includes(width)) {
        await page.locator('#reliability').screenshot({ path: `${process.env.SCREENSHOT_DIR}/availability-${width}.png` });
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await showcase.locator('.is-active img').evaluate(el => getComputedStyle(el).animationName), 'none');
      assert.equal(await showcase.locator('.is-active img').evaluate(el => getComputedStyle(el).maskImage), 'none');
      assert.equal(await showcase.locator('.is-active').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert(await showcase.locator('.is-active').evaluate(el => getComputedStyle(el).maskImage.includes('availability-crop-')), 'crop remains with reduced motion');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(() => !document.querySelector('.reliability-showcase').classList.contains('is-in-view'));
      await showcase.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.reliability-showcase').classList.contains('is-in-view'));
      assert.equal(await showcase.locator('.is-active img').evaluate(el => getComputedStyle(el).animationName), 'availability-image-reveal');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: canvas, all states, keyboard, mask, re-entry, reduced motion`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
