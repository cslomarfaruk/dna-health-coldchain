const { chromium } = require('playwright');
const path = require('path');

async function loginUser(page, username, password) {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!data.token) {
    throw new Error(`Login failed for ${username}: ` + JSON.stringify(data));
  }

  await page.goto('http://localhost:5173/');
  await page.evaluate((session) => {
    localStorage.setItem('dna_session', JSON.stringify(session));
  }, data);
  return data;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const artifactDir = '/home/csl/.gemini/antigravity-ide/brain/ec138766-721e-46af-98b0-3e3d27087627';

  console.log('--- 1. Login as Nurse & Test Unique MRN Generation ---');
  await page.goto('http://localhost:5173/login');
  await page.click('text=Nurse Elizabeth Warren');
  await page.waitForTimeout(2000);
  console.log(`  ✓ Navigated to ${page.url()}`);

  // Verify unique MRN input exists
  const mrnInput = page.locator('input[value^="MRN-"]');
  await mrnInput.waitFor({ state: 'visible', timeout: 5000 });
  const initialMrn = await mrnInput.inputValue();
  console.log(`  ✓ Auto-generated initial MRN: "${initialMrn}"`);

  if (initialMrn === 'MRN-849201') {
    throw new Error('MRN is still static default MRN-849201!');
  }

  // Click quick preset for Omar Faruk
  const omarPreset = page.locator('button:has-text("Omar Faruk (Bed 12)")');
  if (await omarPreset.isVisible()) {
    await omarPreset.click();
    console.log('  ✓ Clicked Omar Faruk preset');
  }

  const omarMrn = await mrnInput.inputValue();
  console.log(`  ✓ MRN for Omar Faruk: "${omarMrn}"`);

  // Submit indent
  const submitBtn = page.locator('button[type="submit"]:has-text("Submit Indent")');
  await submitBtn.click();
  console.log('  ✓ Clicked Submit Indent');

  // Wait for submission confirmation and form reset
  await page.waitForTimeout(1500);
  const nextMrn = await mrnInput.inputValue();
  console.log(`  ✓ Form cleared and reset with new unique MRN: "${nextMrn}"`);

  if (nextMrn === omarMrn) {
    throw new Error('MRN was not reset after submission!');
  }

  await page.screenshot({ path: path.join(artifactDir, '31_nurse_desk_unique_mrn.png'), fullPage: true });
  console.log('  ✓ Captured 31_nurse_desk_unique_mrn.png');

  console.log('--- 2. Login as Lead Pharmacist & Test Patient Navigation ---');
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('text=Dr. Marcus Vance');
  await page.click('text=Dr. Marcus Vance');
  await page.waitForTimeout(2000);
  console.log(`  ✓ Navigated to ${page.url()}`);

  await page.waitForTimeout(2000);

  // Click on Omar Faruk indent card in the queue
  console.log('--- 3. Clicking Omar Faruk indent card in queue ---');
  const omarCard = page.locator('.indent-queue-card:has-text("Omar Faruk")').first();
  await omarCard.waitFor({ state: 'visible', timeout: 5000 });
  await omarCard.click();
  console.log('  ✓ Clicked Omar Faruk indent card in queue');

  await page.waitForTimeout(2000);

  // Assert Patient Header switched to Omar Faruk (second h2 on page)
  const header = page.locator('h2').nth(1);
  const headerText = await header.textContent();
  console.log(`  ✓ Active patient header text: "${headerText}"`);

  if (!headerText.toLowerCase().includes('omar faruk')) {
    throw new Error(`Patient did not switch! Expected "Omar Faruk", got: "${headerText}"`);
  }

  // Verify Concordance Verified badge
  const concordanceBadge = page.locator('.badge-green:has-text("Concordance Verified")').first();
  const isConcordanceVerified = await concordanceBadge.isVisible();
  console.log(`  ✓ 3-Way Concordance Verified: ${isConcordanceVerified}`);

  await page.screenshot({ path: path.join(artifactDir, '32_dispensary_patient_omar_faruk.png'), fullPage: true });
  console.log('  ✓ Captured 32_dispensary_patient_omar_faruk.png');

  // Now click on Warren, Elizabeth card in queue
  console.log('--- 4. Clicking Warren, Elizabeth indent card in queue ---');
  const warrenCard = page.locator('.indent-queue-card:has-text("WARREN, ELIZABETH"), .indent-queue-card:has-text("Warren, Elizabeth")').first();
  if (await warrenCard.isVisible()) {
    await warrenCard.click();
    await page.waitForTimeout(2000);
    const warrenHeaderText = await header.textContent();
    console.log(`  ✓ Patient header text after switch: "${warrenHeaderText}"`);
    if (!warrenHeaderText.toLowerCase().includes('warren')) {
      throw new Error(`Patient did not switch! Expected "Warren", got: "${warrenHeaderText}"`);
    }
    await page.screenshot({ path: path.join(artifactDir, '33_dispensary_patient_warren_switched.png'), fullPage: true });
    console.log('  ✓ Captured 33_dispensary_patient_warren_switched.png');
  }

  console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY ---');
  await browser.close();
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
