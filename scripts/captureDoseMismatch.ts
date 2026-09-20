import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Select Dose Mismatch Scenario
  console.log('Selecting SCENARIO-DOSE-MISMATCH scenario...');
  await page.selectOption('#scenario-select', 'SCENARIO-DOSE-MISMATCH');
  await page.waitForTimeout(1000);

  // Advance to Step 2: Verify Drug
  console.log('Advancing to Step 2...');
  await page.click('button:has-text("Next: Verify Drug")');
  await page.waitForTimeout(1500);

  // Capture screenshot of RxNav Formulation Safety Hold Blocked
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, '08_rxnav_safety_hold_blocked.png'),
    fullPage: true
  });
  console.log('✓ Captured 08_rxnav_safety_hold_blocked.png (fullPage)');

  await browser.close();
}

main().catch((err) => {
  console.error('Safety hold capture error:', err);
  process.exit(1);
});
