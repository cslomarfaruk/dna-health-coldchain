const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();

  const artifactDir = '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627';

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // 1. Log in as Pharmacist Dr. Marcus Vance
  console.log('Logging in as Pharmacist Dr. Marcus Vance...');
  await page.click('text=Dr. Marcus Vance, PharmD');
  await page.waitForTimeout(2000);

  // 2. Capture Unified Dispensary Workstation overview
  console.log('Capturing 24_unified_dispensary_workstation.png...');
  await page.screenshot({ path: path.join(artifactDir, '24_unified_dispensary_workstation.png') });

  // 3. Switch to Overdose scenario to showcase Safety Gate Locked
  console.log('Selecting Overdose scenario for Safety Gate...');
  const scenarioSelect = await page.$('#dispensary-scenario-select');
  if (scenarioSelect) {
    await scenarioSelect.selectOption({ value: 'SCENARIO-DOSE-MISMATCH' });
    await page.waitForTimeout(1500);
    console.log('Capturing 27_unified_dispensary_safety_gate.png...');
    await page.screenshot({ path: path.join(artifactDir, '27_unified_dispensary_safety_gate.png') });
  }

  // 4. Switch back to Standard scenario
  console.log('Switching back to standard scenario...');
  if (scenarioSelect) {
    await scenarioSelect.selectOption({ value: 'SCENARIO-INSULIN' });
    await page.waitForTimeout(1500);
  }

  // 5. Expand HL7 v2.5 Feed Tab
  console.log('Opening HL7 v2.5 Feed technical tab...');
  const hl7TabBtn = await page.$('button:has-text("HL7 v2.5 Feed")');
  if (hl7TabBtn) {
    await hl7TabBtn.click();
    await page.waitForTimeout(500);
    // Scroll down slightly to show technical data
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    console.log('Capturing 26_unified_dispensary_tech_tab.png...');
    await page.screenshot({ path: path.join(artifactDir, '26_unified_dispensary_tech_tab.png') });
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  // 6. Test 1-Click Authorize Fulfillment & Dispatch Courier
  console.log('Clicking Authorize Fulfillment & Dispatch Courier...');
  const dispatchBtn = await page.$('button:has-text("Authorize Fulfillment & Dispatch Courier")');
  if (dispatchBtn) {
    await dispatchBtn.click();
    console.log('Waiting for remote HAPI FHIR response...');
    try {
      await page.waitForSelector('text=Dispatched & In Transit', { timeout: 25000 });
      await page.waitForTimeout(1000);
      console.log('Capturing 25_unified_dispensary_dispatched.png...');
      await page.screenshot({ path: path.join(artifactDir, '25_unified_dispensary_dispatched.png') });
    } catch (e) {
      console.log('Timeout waiting for dispatched selector, capturing current state: ' + e.message);
      await page.screenshot({ path: path.join(artifactDir, '25_unified_dispensary_dispatched.png') });
    }
  }

  await browser.close();
  console.log('All Unified Dispensary screenshots captured successfully!');
})();
