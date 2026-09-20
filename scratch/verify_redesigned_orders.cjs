const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  console.log('1. Logging in as Pharmacist...');
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'pharm_vance');
  await page.fill('input[type="password"]', 'PharmPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dispensary');
  await page.waitForTimeout(1000);

  console.log('2. Navigating to Orders Workstation...');
  await page.goto('http://localhost:5173/orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.screenshot({ path: '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627/38_redesigned_order_records.png', fullPage: true });
  console.log('Saved 38_redesigned_order_records.png');

  console.log('3. Clicking Inspect on first order...');
  const inspectButtons = await page.locator('button:has-text("Inspect")');
  await inspectButtons.first().click();
  await page.waitForTimeout(600);

  await page.screenshot({ path: '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627/39_order_records_inspection_modal.png' });
  console.log('Saved 39_order_records_inspection_modal.png');

  console.log('4. Clicking "Open in Central Dispensary"...');
  await page.click('button:has-text("Open in Central Dispensary")');
  await page.waitForURL('**/dispensary');
  await page.waitForTimeout(1200);

  await page.screenshot({ path: '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627/40_dispensary_loaded_from_orders.png', fullPage: true });
  console.log('Saved 40_dispensary_loaded_from_orders.png');

  await browser.close();
  console.log('All order verification steps completed successfully!');
})();
