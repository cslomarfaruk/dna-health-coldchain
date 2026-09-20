const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/home/csl/.gemini/antigravity-ide/brain/1f4b3041-843a-49ff-97a9-2e265f40541f';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Admin System View - Read-Only Oversight on /indents
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    console.log('Navigating to login as Admin...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'admin_sys');
    await page.fill('input[type="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Now navigate to /indents
    console.log('Navigating to /indents as Admin...');
    await page.goto('http://localhost:5173/indents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const adminImgPath = path.join(ARTIFACTS_DIR, 'admin_indents_readonly.png');
    await page.screenshot({ path: adminImgPath, fullPage: true });
    console.log('Saved:', adminImgPath);

    await ctx.close();
  }

  await browser.close();
  console.log('Admin screenshot captured successfully!');
})();
