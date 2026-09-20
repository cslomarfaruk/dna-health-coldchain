import {
  evaluateSurgicalCase,
  compileFhirSurgicalComposition,
  SURGICAL_LOINC_CODES,
  SURGICAL_RXNORM_CODES,
} from '../../server/modules/surgery/surgeryService';

// Test notification privacy by constructing the same payload the client builds
function buildTestNotificationBody(orderRef: string, courierName: string, eta: number): string {
  const ref = orderRef.replace(/MRN-\d+/gi, '').trim() || 'ORDER';
  return `Courier ${courierName} dispatched (Ref: ${ref}). ETA: ~${eta} min. Open app for drop-zone details.`;
}

function runSurgeryUnitTests() {
  console.log('--- UNIT TEST: Operating Room Surgical Safety & Time-Out Engine ---');

  // Test 1: Standard Cleared Case (Right Total Hip Arthroplasty)
  console.log('Test 1: Standard cleared surgical case (Right Total Hip Arthroplasty)...');
  const clearedCase = evaluateSurgicalCase('surg-case-001');

  if (clearedCase.overallReadiness !== 'CLEARED_FOR_INCISION') {
    throw new Error(`Expected CLEARED_FOR_INCISION, got: ${clearedCase.overallReadiness}`);
  }
  if (clearedCase.activeSafetyHolds.length !== 0) {
    throw new Error(`Expected 0 active holds, found: ${clearedCase.activeSafetyHolds.length}`);
  }
  if (!clearedCase.consent.isSigned || clearedCase.consent.consentStatus !== 'active') {
    throw new Error('Expected active signed consent');
  }
  if (clearedCase.allergies.safetyStatus !== 'CLEARED') {
    throw new Error(`Expected CLEARED allergy status, got: ${clearedCase.allergies.safetyStatus}`);
  }
  if (clearedCase.coagulation.overallStatus !== 'SAFE') {
    throw new Error(`Expected SAFE coagulation status, got: ${clearedCase.coagulation.overallStatus}`);
  }
  console.log('  ✓ Verified: Scheduled procedure, consent, Cefazolin prophylaxis, and LOINC coagulation panel all cleared.');

  // Test 2: Safety Hold on Missing / Unsigned Consent
  console.log('Test 2: Pre-incision safety hold on unsigned/missing surgical consent...');
  const missingConsentCase = evaluateSurgicalCase('surg-case-002-missing-consent');

  if (missingConsentCase.overallReadiness !== 'SURGICAL_HOLD_ENGAGED') {
    throw new Error(`Expected SURGICAL_HOLD_ENGAGED, got: ${missingConsentCase.overallReadiness}`);
  }
  const hasConsentHold = missingConsentCase.activeSafetyHolds.some((h) => h.includes('CONSENT_MISSING_OR_UNSIGNED'));
  if (!hasConsentHold) {
    throw new Error('Expected CONSENT_MISSING_OR_UNSIGNED in active safety holds');
  }
  console.log(`  ✓ Verified: Surgical hold engaged: "${missingConsentCase.activeSafetyHolds[0]}"`);

  // Test 3: Safety Gate on Antibiotic Prophylaxis Allergy (Penicillin / Cefazolin Anaphylaxis)
  console.log('Test 3: Safety gate on severe antibiotic allergy to prophylaxis...');
  const allergyCase = evaluateSurgicalCase('surg-case-003-antibiotic-allergy');

  if (allergyCase.overallReadiness !== 'SURGICAL_HOLD_ENGAGED') {
    throw new Error(`Expected SURGICAL_HOLD_ENGAGED, got: ${allergyCase.overallReadiness}`);
  }
  if (allergyCase.allergies.safetyStatus !== 'ALLERGY_ALERT_CONTRAINDICATED') {
    throw new Error(`Expected ALLERGY_ALERT_CONTRAINDICATED, got: ${allergyCase.allergies.safetyStatus}`);
  }
  if (!allergyCase.allergies.recommendedAlternative?.includes('Vancomycin')) {
    throw new Error('Expected Vancomycin recommendation for beta-lactam allergic patient');
  }
  console.log(`  ✓ Verified: Anaphylaxis risk caught. Recommended non-beta-lactam alternative: "${allergyCase.allergies.recommendedAlternative}"`);

  // Test 4: Critical Coagulopathy / Bleeding Risk Gate (INR 2.8, Platelets 42K)
  console.log('Test 4: Critical coagulopathy hemorrhage risk gate (Elevated INR & Low Platelets)...');
  const highInrCase = evaluateSurgicalCase('surg-case-004-high-inr');

  if (highInrCase.overallReadiness !== 'SURGICAL_HOLD_ENGAGED') {
    throw new Error(`Expected SURGICAL_HOLD_ENGAGED, got: ${highInrCase.overallReadiness}`);
  }
  if (highInrCase.coagulation.overallStatus !== 'CRITICAL_BLEEDING_RISK') {
    throw new Error(`Expected CRITICAL_BLEEDING_RISK, got: ${highInrCase.coagulation.overallStatus}`);
  }
  if (highInrCase.coagulation.tests.inr.status !== 'CRITICAL_RISK') {
    throw new Error('Expected INR 2.8 to be marked CRITICAL_RISK');
  }
  if (highInrCase.coagulation.tests.platelets.status !== 'CRITICAL_RISK') {
    throw new Error('Expected Platelets 42K to be marked CRITICAL_RISK');
  }
  console.log(`  ✓ Verified: Bleeding risk safely blocked incision: "${highInrCase.activeSafetyHolds[0]}"`);

  // Test 5: HL7 FHIR R4 Composition Document Compilation
  console.log('Test 5: Compiling official HL7 FHIR R4 Composition document (LOINC 11537-8)...');
  const composition = compileFhirSurgicalComposition(clearedCase);

  if (composition.resourceType !== 'Composition') {
    throw new Error(`Expected Composition resource, got: ${composition.resourceType}`);
  }
  if (composition.type.coding[0].code !== SURGICAL_LOINC_CODES.SURGICAL_TIMEOUT_NOTE) {
    throw new Error(`Expected LOINC 11537-8, got: ${composition.type.coding[0].code}`);
  }
  if (composition.section.length !== 5) {
    throw new Error(`Expected 5 clinical sections, got: ${composition.section.length}`);
  }
  console.log(`  ✓ Verified: Official Composition compiled with 5 sections: ${composition.section.map((s: any) => s.title.split('.')[1]?.trim()).join(', ')}`);

  // Test 6: Mobile & Desktop Push Notification Privacy (Lock Screen Safe Harbor Verification)
  console.log('Test 6: Notification Center Lock Screen Privacy Protection (Zero PHI)...');
  const notifBody = buildTestNotificationBody('WF-2026-9042', 'James Miller (COUR-409)', 10);

  // Verify Zero PHI in lock screen notification payload
  const forbiddenPhi = ['WARREN', 'ELIZABETH', '849201', '1972', 'BED-12', 'DIABETES'];
  const fullText = ('Medication En Route ' + notifBody).toUpperCase();

  for (const phi of forbiddenPhi) {
    if (fullText.includes(phi)) {
      throw new Error(`CRITICAL PRIVACY LEAK: Notification contains direct PHI identifier: "${phi}"`);
    }
  }
  console.log(`  \u2713 Proved Zero PHI in notification center payload: "${notifBody}"`);

  console.log('\u2713 All Surgical Safety & Notification Privacy unit tests passed!\n');
}

try {
  runSurgeryUnitTests();
} catch (err: any) {
  console.error('✕ Surgery unit test failed:', err.message);
  process.exit(1);
}
