const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
  const artifactDir = '/home/csl/.gemini/antigravity-ide/brain/1f4b3041-843a-49ff-97a9-2e265f40541f';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    console.log('2. Authenticating as Pharmacist Dr. Marcus Vance...');
    await page.click('text=Dr. Marcus Vance, PharmD');
    await page.waitForTimeout(2000);

    // Verify on /dispensary
    assert(page.url().includes('/dispensary'), 'Should redirect to /dispensary');
    console.log('  ✓ Successfully on /dispensary');

    // 3. Filter Medication Queue for DISPATCHED orders
    console.log('3. Filtering Medication Queue for DISPATCHED items...');
    const dispatchedFilterBtn = page.locator('button:has-text("DISPATCHED")').first();
    await dispatchedFilterBtn.click();
    await page.waitForTimeout(600);

    // Check if there is a dispatched item in the queue
    const dispatchedBadge = page.locator('span:text-is("DISPATCHED")').first();
    const hasDispatched = await dispatchedBadge.isVisible();
    assert(hasDispatched, 'Should have at least one DISPATCHED item in queue');

    console.log('4. Clicking a DISPATCHED order in the Medication Queue...');
    await dispatchedBadge.click();
    await page.waitForTimeout(1000);

    // 5. Verify that for DISPATCHED request:
    // a) The 5-step wizard progress bar is NOT displayed
    const step1ActiveText = await page.locator('text=Step 1 of 5 Active').isVisible();
    assert(!step1ActiveText, 'Dispatched order must NOT show the 5-step sequential wizard stepper');
    console.log('  ✓ Verified: 5-step sequential wizard stepper is hidden for dispatched order!');

    // b) The Complete Clinical Dossier banner is displayed
    const dossierBanner = await page.locator('#dispatched-dossier-banner').isVisible();
    assert(dossierBanner, 'Dispatched order must display Complete Clinical Dossier banner');
    const dossierTitle = await page.locator('text=Dispatched Medication Record · Complete Clinical Dossier').isVisible();
    assert(dossierTitle, 'Dossier header title must be visible');
    const dispenseCompleteBadge = await page.locator('text=Dispense Complete').isVisible();
    assert(dispenseCompleteBadge, 'Dispense Complete badge must be visible');
    console.log('  ✓ Verified: "Dispatched Medication Record · Complete Clinical Dossier" banner displayed!');

    // c) Verify that ALL 5 information sections are rendered simultaneously
    console.log('5. Verifying that ALL 5 information sections are visible simultaneously...');
    const sectionRx = await page.locator('#section-rx').isVisible();
    assert(sectionRx, 'Section 1 (Prescription & Chart) must be visible');
    console.log('  ✓ Section 1 (Prescription & Patient Chart) is visible');

    const sectionRxNorm = await page.locator('#section-rxnorm').isVisible();
    assert(sectionRxNorm, 'Section 2 (Drug Formulation Validation) must be visible');
    console.log('  ✓ Section 2 (Drug Validation - RxNorm) is visible');

    const sectionConcordance = await page.locator('#section-concordance').isVisible();
    assert(sectionConcordance, 'Section 3 (3-Way Concordance) must be visible');
    console.log('  ✓ Section 3 (3-Way Concordance Record) is visible');

    const sectionDispense = await page.locator('#section-dispense').isVisible();
    assert(sectionDispense, 'Section 4 (Cold Chain & Dispense Record) must be visible');
    console.log('  ✓ Section 4 (Cold Chain & Dispense Record) is visible');

    const sectionAudit = await page.locator('#section-audit').isVisible();
    assert(sectionAudit, 'Section 5 (HIPAA Audit & Alerts) must be visible');
    console.log('  ✓ Section 5 (HIPAA Compliance & Audit Event Ledger) is visible');

    // d) Verify redundant stepper navigation buttons are hidden
    const verifyRxBtn = await page.locator('button:has-text("Verify Prescription & Proceed to Drug Validation")').isVisible();
    assert(!verifyRxBtn, 'Step 1 navigation button must be hidden in complete dossier view');
    const confirmRxNormBtn = await page.locator('button:has-text("Confirm RxNorm Formulation & Proceed to Delivery Check")').isVisible();
    assert(!confirmRxNormBtn, 'Step 2 navigation button must be hidden in complete dossier view');
    console.log('  ✓ Verified: Redundant step navigation buttons are hidden');

    // e) Verify dossier certification footer and print buttons
    const certBanner = await page.locator('text=Clinical Dispense Record Certified · Non-Repudiation Seal Active').isVisible();
    assert(certBanner, 'Dossier Certification Banner must be visible at bottom');
    const printBtn = await page.locator('button:has-text("Print Record")').first().isVisible();
    assert(printBtn, 'Print Record button must be visible');
    console.log('  ✓ Verified: Certification banner and Print button are visible');

    await page.screenshot({ path: path.join(artifactDir, 'dispensary_dispatched_complete_dossier_all_info.png') });
    console.log('  ✓ Captured screenshot: dispensary_dispatched_complete_dossier_all_info.png');

    // 6. Test toggling to Step-by-Step view on a dispatched order
    console.log('6. Testing toggle: Clicking "View by Steps"...');
    await page.click('button:has-text("View by Steps")');
    await page.waitForTimeout(600);

    const stepStepperVisible = await page.locator('text=Prescription Fulfillment Pipeline · Case Requirements (1 – 5)').isVisible();
    assert(stepStepperVisible, 'Stepper must be displayed when user opts to view by steps');
    console.log('  ✓ User can view by steps if desired');

    // Toggle back to All Information
    console.log('7. Clicking "Show All Information" button...');
    await page.click('button:has-text("Show All Information")');
    await page.waitForTimeout(600);

    const backToDossier = await page.locator('#dispatched-dossier-banner').isVisible();
    assert(backToDossier, 'Must return to Complete Clinical Dossier');
    console.log('  ✓ Toggled back to Complete Clinical Dossier!');

    // 8. Now switch to a PENDING order to ensure strict sequential workflow is preserved
    console.log('8. Selecting a PENDING order from queue...');
    const pendingFilterBtn = page.locator('button:has-text("PENDING")').first();
    await pendingFilterBtn.click();
    await page.waitForTimeout(600);

    const pendingItem = page.locator('span:text-is("PENDING")').first();
    await pendingItem.click();
    await page.waitForTimeout(1000);

    // Verify pending order displays Step 1 and NOT the complete dossier
    const pendingStep1Active = await page.locator('text=Step 1 of 5 Active').isVisible();
    assert(pendingStep1Active, 'Pending order MUST show the sequential stepper starting at Step 1');
    const pendingSection2Hidden = await page.locator('#section-rxnorm').isVisible();
    assert(!pendingSection2Hidden, 'Step 2 must NOT be rendered when Step 1 is active on pending order');
    console.log('  ✓ Verified: Pending order strictly retains sequential 1-step pipeline starting at Step 1');

    await page.screenshot({ path: path.join(artifactDir, 'dispensary_pending_sequential_pipeline_step1.png') });
    console.log('  ✓ Captured screenshot: dispensary_pending_sequential_pipeline_step1.png');

    console.log('\n======================================================');
    console.log('ALL DISPATCHED & SEQUENTIAL REQUIREMENTS PASSED 100%!');
    console.log('======================================================');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
