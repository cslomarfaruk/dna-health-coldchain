const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
  const artifactDir = '/home/csl/.gemini/antigravity-ide/brain/1f4b3041-843a-49ff-97a9-2e265f40541f';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  try {
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    console.log('2. Authenticating as Pharmacist Dr. Marcus Vance...');
    await page.click('text=Dr. Marcus Vance, PharmD');
    await page.waitForTimeout(2000);

    // Verify on /dispensary
    assert(page.url().includes('/dispensary'), 'Should redirect to /dispensary');
    console.log('  ✓ Successfully on /dispensary');

    // Select a PENDING order from the queue to test sequential fulfillment pipeline
    console.log('  Filtering queue for PENDING indents...');
    await page.click('button:has-text("PENDING")');
    await page.waitForTimeout(500);
    const pendingItem = page.locator('span:text-is("PENDING")').first();
    await pendingItem.click();
    await page.waitForTimeout(800);

    // Verify initially on Step 1
    const step1ActiveText = await page.locator('text=Step 1 of 5 Active').isVisible();
    assert(step1ActiveText, 'Workstation must start on Step 1 for pending order');
    console.log('  ✓ Workstation starts strictly on Step 1 for pending order');

    // Attempt to click Step 4 tab in the header
    console.log('3. Testing forward jumping restriction: Attempting to click Step 4 tab...');
    await page.click('#dispensary-step-tab-4');
    await page.waitForTimeout(500);

    // Active step should still be 1!
    const stillStep1 = await page.locator('text=Step 1 of 5 Active').isVisible();
    assert(stillStep1, 'Active step must remain 1 after attempting to jump to locked Step 4');
    
    // Check for lock notification
    const lockNoticeVisible = await page.locator('#dispensary-step-notice').isVisible();
    assert(lockNoticeVisible, 'Lock notice must be displayed when attempting to jump ahead');
    console.log('  ✓ Forward jump blocked! Lock notice displayed.');

    await page.screenshot({ path: path.join(artifactDir, 'dispensary_step1_locked_notice.png') });

    // 4. Advance sequentially to Step 2
    console.log('4. Clicking "Verify Prescription & Proceed to Drug Validation (Step 2)"...');
    await page.click('button:has-text("Verify Prescription & Proceed to Drug Validation")');
    await page.waitForTimeout(600);

    const step2Active = await page.locator('text=Step 2 of 5 Active').isVisible();
    assert(step2Active, 'Workstation must advance to Step 2');
    console.log('  ✓ Successfully advanced to Step 2');
    await page.screenshot({ path: path.join(artifactDir, 'dispensary_step2_unlocked.png') });

    // 5. Advance sequentially to Step 3
    console.log('5. Clicking "Confirm RxNorm Formulation & Proceed to Delivery Check (Step 3)"...');
    await page.click('button:has-text("Confirm RxNorm Formulation & Proceed to Delivery Check")');
    await page.waitForTimeout(600);

    const step3Active = await page.locator('text=Step 3 of 5 Active').isVisible();
    assert(step3Active, 'Workstation must advance to Step 3');
    console.log('  ✓ Successfully advanced to Step 3');
    await page.screenshot({ path: path.join(artifactDir, 'dispensary_step3_concordance.png') });

    // 6. Test Request Change Reset to Step 1
    console.log('6. Testing Request Change: Selecting Dose Mismatch scenario...');
    const scenarioSelect = page.locator('#dispensary-scenario-select');
    await scenarioSelect.selectOption({ value: 'SCENARIO-DOSE-MISMATCH' });
    await page.waitForTimeout(1000);

    const resetToStep1 = await page.locator('text=Step 1 of 5 Active').isVisible();
    assert(resetToStep1, 'Changing request MUST strictly reset workstation to Step 1');
    console.log('  ✓ Changing request successfully reset workstation to Step 1!');
    await page.screenshot({ path: path.join(artifactDir, 'dispensary_reset_to_step1_on_change.png') });

    // 7. Verify Clinical Safety Hold on Dose Mismatch at Step 3
    console.log('7. Stepping through Dose Mismatch scenario: Step 1 -> Step 2 -> Step 3...');
    await page.click('button:has-text("Verify Prescription & Proceed to Drug Validation")');
    await page.waitForTimeout(600);
    await page.click('button:has-text("Confirm RxNorm Formulation & Proceed to Delivery Check")');
    await page.waitForTimeout(800);

    const clinicalHoldButton = await page.locator('button:has-text("Dispensing Blocked (Clinical Safety Hold)")').isVisible();
    assert(clinicalHoldButton, 'Step 3 must display disabled Clinical Safety Hold button for dose mismatch');
    console.log('  ✓ Step 3 blocks progression: "Dispensing Blocked (Clinical Safety Hold)" button displayed');

    // Attempt to click Step 4 tab in header on mismatch
    await page.click('#dispensary-step-tab-4');
    const noticeEl = page.locator('#dispensary-step-notice');
    const holdNotice = await noticeEl.isVisible();
    const noticeText = holdNotice ? await noticeEl.innerText() : '';
    assert(holdNotice && noticeText.includes('3-Way Reconciliation failed concordance'), 'Safety hold notice must be displayed when clicking Step 4 on mismatch');
    console.log('  ✓ Clicking Step 4 displays concordance failure safety hold notice');
    await page.screenshot({ path: path.join(artifactDir, 'dispensary_clinical_hold_dose_mismatch.png') });

    // 8. Switch to standard valid scenario
    console.log('8. Switching back to standard Insulin Glargine scenario...');
    await scenarioSelect.selectOption({ value: 'SCENARIO-INSULIN' });
    await page.waitForTimeout(1000);

    // If order was already dispatched, verify Complete Dossier and toggle to View by Steps
    const isDossier = await page.locator('#dispatched-dossier-banner').isVisible();
    if (isDossier) {
      console.log('  ✓ SCENARIO-INSULIN is already dispatched: displays Complete Clinical Dossier with ALL information!');
      console.log('  Toggling to "View by Steps" to review step pipeline...');
      await page.click('button:has-text("View by Steps")');
      await page.waitForTimeout(600);
      
      const stepStepper = await page.locator('text=Prescription Fulfillment Pipeline').isVisible();
      assert(stepStepper, 'Stepper must be displayed in View by Steps mode');
      console.log('  ✓ Stepper displayed in View by Steps mode');
    } else {
      const resetAgain = await page.locator('text=Step 1 of 5 Active').isVisible();
      assert(resetAgain, 'Reset to Step 1 confirmed on scenario return');

      console.log('9. Completing full 5-step pipeline: 1 -> 2 -> 3 -> 4 -> 5...');
      await page.click('button:has-text("Verify Prescription & Proceed to Drug Validation")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Confirm RxNorm Formulation & Proceed to Delivery Check")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Accept Concordance & Proceed to Dispatch")');
      await page.waitForTimeout(500);

      const step4Active = await page.locator('text=Step 4 of 5 Active').isVisible();
      assert(step4Active, 'Workstation must reach Step 4');
      console.log('  ✓ Successfully reached Step 4 (Approve & Dispatch)');

      console.log('10. Authorizing fulfillment and dispatch...');
      await page.click('button:has-text("Approve & Send")');
      await page.waitForTimeout(3000);
    }

    // 11. Now test selecting an indent from the Medication Queue
    console.log('11. Selecting an indent from Medication Queue...');
    const pendingFilterBtn = page.locator('button:has-text("PENDING")').first();
    await pendingFilterBtn.click();
    await page.waitForTimeout(600);

    // Click the first pending item in the list
    const pendingBadge = page.locator('span:text-is("PENDING")').first();
    await pendingBadge.click();
    await page.waitForTimeout(1000);

    const queueResetToStep1 = await page.locator('text=Step 1 of 5 Active').isVisible();
    assert(queueResetToStep1, 'Selecting queue item MUST reset workstation to Step 1');
    console.log('  ✓ Selecting indent from queue strictly reset workstation to Step 1!');
    await page.screenshot({ path: path.join(artifactDir, 'dispensary_queue_item_reset_step1.png') });

    console.log('\n=============================================');
    console.log('ALL SEQUENTIAL PROGRESSION TESTS PASSED 100%!');
    console.log('=============================================');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
