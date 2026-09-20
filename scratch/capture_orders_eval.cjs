const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'pharm_vance');
  await page.fill('input[type="password"]', 'PharmPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dispensary');
  await page.waitForTimeout(1000);

  await page.goto('http://localhost:5173/orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  await page.screenshot({ path: '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627/37_order_records_inspection.png', fullPage: true });
  console.log('Saved 37_order_records_inspection.png');

  await browser.close();
})();
