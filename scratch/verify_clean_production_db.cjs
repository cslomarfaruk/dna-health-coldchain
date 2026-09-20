const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1. Auditor view of Audit Vault
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'auditor_chen');
    await page.fill('input[type="password"]', 'AuditPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/audit');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627/35_clean_audit_production.png', fullPage: true });
    console.log('Saved 35_clean_audit_production.png');
    await ctx.close();
  }

  // 2. Nurse view of Nurse Desk
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'nurse_elizabeth');
    await page.fill('input[type="password"]', 'NursePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/indents');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627/36_clean_nurse_desk_production.png', fullPage: true });
    console.log('Saved 36_clean_nurse_desk_production.png');
    await ctx.close();
  }

  await browser.close();
  console.log('All screenshots captured!');
})();
