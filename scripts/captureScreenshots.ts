import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627';

async function main() {
  console.log('Launching headless Chromium via Playwright...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Step 1: Doctor's Order
  console.log('Capturing Step 1: Doctor\'s Order...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_step1_doctors_order.png') });

  // Advance to Step 2: Verify Drug
  console.log('Advancing to Step 2: Verify Drug...');
  await page.click('button:has-text("Next: Verify Drug")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_step2_verify_drug.png') });

  // Advance to Step 3: Delivery Request & 3-Way Reconciliation
  console.log('Advancing to Step 3: Delivery Request & 3-Way Reconciliation...');
  await page.click('button:has-text("Next: Delivery Request")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_step3_delivery_reconciliation.png') });

  // Advance to Step 4: Pack & Dispatch
  console.log('Advancing to Step 4: Pack & Dispatch...');
  await page.click('button:has-text("Next: Pack & Dispatch")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_step4_pack_dispatch.png') });

  // Execute Fulfillment (Pharmacist authorization & HAPI writeback)
  console.log('Executing Step 4 -> Step 5 Fulfillment Authorization...');
  await page.click('button:has-text("Next: Notify Nurse")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_step5_notify_nurse.png') });

  // Advance to Step 6: Update Chart
  console.log('Advancing to Step 6: Update Chart...');
  await page.click('button:has-text("Next: Update Chart")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_step6_update_chart.png') });

  // Safety Gate Verification: Switch to Nurse role and test lock
  console.log('Testing Safety Gate with Nurse role...');
  const roleSelect = await page.$('select');
  if (roleSelect) {
    await roleSelect.selectOption('NURSE');
    await page.waitForTimeout(800);
  }

  // Navigate back to step 4
  const step4Btn = await page.$('button:has-text("Pack & Dispatch"), div:has-text("Pack & Dispatch")');
  if (step4Btn) {
    await step4Btn.click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // Attempt fulfillment as Nurse
  const notifyBtn = await page.$('button:has-text("Next: Notify Nurse")');
  if (notifyBtn) {
    await notifyBtn.click().catch(() => {});
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_safety_gate_blocked.png') });

  await browser.close();
  console.log('All 7 screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Playwright execution error:', err);
  process.exit(1);
});
