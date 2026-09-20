const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();

  const artifactDir = '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627';

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // 1. Log in as Auditor Arthur Chen
  console.log('Logging in as Auditor Arthur Chen, CISA...');
  await page.click('text=Arthur Chen, CISA');
  await page.waitForTimeout(2000);

  // 2. Capture Redesigned Audit Vault
  console.log('Capturing 29_redesigned_audit_vault.png...');
  await page.screenshot({ path: path.join(artifactDir, '29_redesigned_audit_vault.png') });

  // 3. Click "Inspect" button on the first row to open detailed modal
  const inspectBtn = await page.$('button:has-text("Inspect")');
  if (inspectBtn) {
    console.log('Opening Audit Inspection Modal...');
    await inspectBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 30_audit_event_inspection_modal.png...');
    await page.screenshot({ path: path.join(artifactDir, '30_audit_event_inspection_modal.png') });
  }

  await browser.close();
  console.log('Audit Vault screenshots captured successfully!');
})();
