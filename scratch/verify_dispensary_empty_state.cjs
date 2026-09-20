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

    // TEST 1: Initial Empty State Verification
    console.log('\n--- TEST 1: Initial Empty State Verification (No Patient Selected) ---');
    const emptyStateCard = page.locator('#dispensary-empty-state');
    const isEmptyStateVisible = await emptyStateCard.isVisible();
    assert(isEmptyStateVisible, 'Empty state card (#dispensary-empty-state) must be visible on initial visit');
    console.log('  ✓ Verified: Empty state card is visible!');

    // Verify steps and dossier banners are NOT visible
    const stepperTitle = await page.locator('text=Prescription Fulfillment Pipeline · Case Requirements (1 – 5)').isVisible();
    assert(!stepperTitle, 'Stepper progress bar must NOT be displayed when no patient is selected');

    const dossierBanner = await page.locator('#dispatched-dossier-banner').isVisible();
    assert(!dossierBanner, 'Dispatched dossier banner must NOT be displayed when no patient is selected');

    const sectionRx = await page.locator('#section-rx').isVisible();
    assert(!sectionRx, 'Section 1 (Prescription) must NOT be displayed when no patient is selected');

    const sectionRxNorm = await page.locator('#section-rxnorm').isVisible();
    assert(!sectionRxNorm, 'Section 2 (RxNorm) must NOT be displayed when no patient is selected');

    console.log('  ✓ Verified: Stepper, dossier banner, and all step cards are hidden when no patient is selected!');

    await page.screenshot({ path: path.join(artifactDir, 'dispensary_empty_state_initial.png') });
    console.log('  ✓ Captured screenshot: dispensary_empty_state_initial.png');

    // TEST 2: Selecting a Pending Request from Queue
    console.log('\n--- TEST 2: Selecting a Pending Request from Queue ---');
    // Filter by PENDING
    const pendingFilterBtn = page.locator('button:has-text("PENDING")').first();
    await pendingFilterBtn.click();
    await page.waitForTimeout(500);

    // Find and click the first pending item in the queue
    const firstPendingItem = page.locator('[id^="dispensary-queue-item-"]').first();
    await firstPendingItem.click();
    await page.waitForTimeout(1000);

    // Verify Stepper is now visible
    const stepperNowVisible = await page.locator('text=Prescription Fulfillment Pipeline · Case Requirements (1 – 5)').isVisible();
    assert(stepperNowVisible, 'Stepper must be displayed once a patient request is clicked');
    console.log('  ✓ Verified: Stepper is visible after selecting patient');

    // Verify Step 1 is active
    const step1Active = await page.locator('text=Step 1 of 5 Active').isVisible();
    assert(step1Active, 'Step 1 must be active on selecting a pending request');
    console.log('  ✓ Verified: Step 1 is active');

    // Verify Section 1 details are visible
    const section1Visible = await page.locator('#section-rx').isVisible();
    assert(section1Visible, 'Section 1 (Prescription details) must be displayed');
    console.log('  ✓ Verified: Prescription details and EHR record are displayed');

    await page.screenshot({ path: path.join(artifactDir, 'dispensary_pending_selected_step1.png') });
    console.log('  ✓ Captured screenshot: dispensary_pending_selected_step1.png');

    // TEST 3: Clearing Patient Selection Returns to Empty State
    console.log('\n--- TEST 3: Clearing Selection to Return to Empty State ---');
    const clearSelectionBtn = page.locator('#btn-clear-patient-selection');
    const isClearBtnVisible = await clearSelectionBtn.isVisible();
    assert(isClearBtnVisible, 'Clear Patient Selection button must be visible in queue header');

    await clearSelectionBtn.click();
    await page.waitForTimeout(800);

    const emptyStateReturned = await page.locator('#dispensary-empty-state').isVisible();
    assert(emptyStateReturned, 'Empty state must return after clicking Clear Patient Selection');
    const stepperHiddenAgain = !(await page.locator('text=Prescription Fulfillment Pipeline · Case Requirements (1 – 5)').isVisible());
    assert(stepperHiddenAgain, 'Stepper must be hidden again when patient is cleared');
    console.log('  ✓ Verified: Clicking "Clear Patient Selection" smoothly returns to empty state!');

    await page.screenshot({ path: path.join(artifactDir, 'dispensary_cleared_to_empty_state.png') });
    console.log('  ✓ Captured screenshot: dispensary_cleared_to_empty_state.png');

    // TEST 4: Quick Start from Empty State Button
    console.log('\n--- TEST 4: Quick Start Process from Empty State ---');
    const quickStartBtn = page.locator('#btn-quick-start-pending');
    const isQuickStartVisible = await quickStartBtn.isVisible();
    assert(isQuickStartVisible, 'Quick Start button must be visible in empty state');

    await quickStartBtn.click();
    await page.waitForTimeout(1000);

    const step1AfterQuickStart = await page.locator('#section-rx').isVisible();
    assert(step1AfterQuickStart, 'Quick Start must load patient request and display Step 1');
    console.log('  ✓ Verified: Quick Start button instantly loads pending request into Step 1');

    // Advance and fulfill this order so it transitions to DISPATCHED
    console.log('  Advancing order to Step 4 and authorizing dispatch...');
    await page.click('button:has-text("Verify Prescription & Proceed to Drug Validation")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Confirm RxNorm Formulation & Proceed to Delivery Check")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Accept Concordance & Proceed to Dispatch")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Approve & Send")');
    await page.waitForTimeout(2500);

    // TEST 5: Selecting a Dispatched Order Shows Complete Dossier (No Steps)
    console.log('\n--- TEST 5: Selecting a DISPATCHED Order from Queue ---');
    const dispatchedFilterBtn = page.locator('button:has-text("DISPATCHED")').first();
    await dispatchedFilterBtn.click();
    await page.waitForTimeout(500);

    const firstDispatchedItem = page.locator('[id^="dispensary-queue-item-"]').first();
    await firstDispatchedItem.click();
    await page.waitForTimeout(1000);

    const dossierBannerVisible = await page.locator('#dispatched-dossier-banner').isVisible();
    assert(dossierBannerVisible, 'Complete Clinical Dossier banner must be visible for dispatched order');

    const stepperHiddenForDispatched = !(await page.locator('text=Prescription Fulfillment Pipeline · Case Requirements (1 – 5)').isVisible());
    assert(stepperHiddenForDispatched, 'Stepper must NOT be visible for dispatched order (shows complete dossier instead)');

    const s1 = await page.locator('#section-rx').isVisible();
    const s2 = await page.locator('#section-rxnorm').isVisible();
    const s3 = await page.locator('#section-concordance').isVisible();
    const s4 = await page.locator('#section-dispense').isVisible();
    const s5 = await page.locator('#section-audit').isVisible();
    assert(s1 && s2 && s3 && s4 && s5, 'All 5 sections must be visible together in Complete Dossier');
    console.log('  ✓ Verified: Dispatched order displays Complete Clinical Dossier with all 5 sections simultaneously!');

    await page.screenshot({ path: path.join(artifactDir, 'dispensary_dispatched_dossier_from_queue.png') });
    console.log('  ✓ Captured screenshot: dispensary_dispatched_dossier_from_queue.png');

    console.log('\n================================================================');
    console.log('🎉 ALL EMPTY STATE & MODULAR DISPENSARY TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
