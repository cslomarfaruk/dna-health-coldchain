const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/home/csl/.gemini/antigravity-ide/brain/1f4b3041-843a-49ff-97a9-2e265f40541f';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1. Nurse Elizabeth View & Requisition Submission
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    console.log('Navigating to login as Nurse...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'nurse_elizabeth');
    await page.fill('input[type="password"]', 'NursePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/indents');
    await page.waitForTimeout(2000);

    const nurseImgPath = path.join(ARTIFACTS_DIR, 'nurse_indents_workstation.png');
    await page.screenshot({ path: nurseImgPath, fullPage: true });
    console.log('Saved:', nurseImgPath);

    // Click Rahim Uddin preset
    console.log('Clicking Rahim Uddin preset...');
    const rahimBtn = await page.getByRole('button', { name: /RAHIM UDDIN/i }).first();
    if (rahimBtn) {
      await rahimBtn.click();
      await page.waitForTimeout(1000);
    }

    // Submit requisition
    console.log('Submitting requisition...');
    const submitBtn = await page.getByRole('button', { name: /Submit Requisition to Central Pharmacy/i });
    await submitBtn.click();
    await page.waitForTimeout(2500);

    const submittedImgPath = path.join(ARTIFACTS_DIR, 'nurse_indent_submitted.png');
    await page.screenshot({ path: submittedImgPath, fullPage: true });
    console.log('Saved:', submittedImgPath);

    await ctx.close();
  }

  // 2. Admin System View - Read-Only Oversight
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    console.log('Navigating to login as Admin...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'admin_sys');
    await page.fill('input[type="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/audit');
    
    // Now navigate to /indents
    await page.goto('http://localhost:5173/indents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const adminImgPath = path.join(ARTIFACTS_DIR, 'admin_indents_readonly.png');
    await page.screenshot({ path: adminImgPath, fullPage: true });
    console.log('Saved:', adminImgPath);

    await ctx.close();
  }

  await browser.close();
  console.log('All automated browser tests completed successfully!');
})();
