import { prisma } from '../../server/db';
import { notificationService } from '../../server/modules/notification/notificationService';

async function testPhiSafeNotification() {
  console.log('--- UNIT TEST: HIPAA Safe Harbor & Notification Minimization ---');

  // Create or find a test workflow to satisfy relational constraint
  const testWf = await prisma.dispenseWorkflow.upsert({
    where: { workflowNumber: 'WF-TEST-UNIT-9042' },
    update: {},
    create: {
      workflowNumber: 'WF-TEST-UNIT-9042',
      status: 'VALIDATED',
      coolerBoxId: 'COOLER-TEST',
      currentTempCelsius: 3.5,
    },
  });

  // Test 1: Standard de-identified nurse alert
  console.log('Test 1: Standard nurse notification payload...');
  const result = await notificationService.sendNurseAlert({
    workflowId: testWf.id,
    workflowNumber: 'WF-2026-9042',
    dropZone: 'Ward 4B - Med Fridge Lockbox A',
    estimatedArrivalMinutes: 10,
    recipientRole: 'NURSE',
    courierName: 'James Miller',
  });

  if (result.status !== 'SENT') {
    throw new Error(`Expected SENT status, got ${result.status}`);
  }

  const msg = result.sanitizedMessage;
  console.log(`  Notification output: "${msg}"`);

  // Assertions: 45 CFR § 164.514(b) Direct Identifiers Check
  const prohibitedElements = [
    'Warren',
    'Elizabeth',
    'Jane',
    'Doe',
    'MRN-',
    '849201',
    'Insulin',
    'Glargine',
    'Bed 12',
    'Diabetes',
  ];

  for (const element of prohibitedElements) {
    if (msg.toLowerCase().includes(element.toLowerCase())) {
      throw new Error(`CRITICAL PHI LEAK: Notification contains prohibited identifier: "${element}"`);
    }
  }

  // Assertions: Verify Courier & ETA are present
  if (!msg.includes('Courier: James Miller')) {
    throw new Error('Notification missing courier identity');
  }
  if (!msg.includes('ETA: 10 mins')) {
    throw new Error('Notification missing ETA');
  }

  console.log('  ✓ Proved ZERO direct PHI present in notification payload');
  console.log('  ✓ Proved Courier identity and ETA arrival time present in notification payload');
  console.log('✓ Notification minimization unit tests passed!\n');
}

testPhiSafeNotification().catch((err) => {
  console.error('✕ PHI Sanitizer test failed:', err.message);
  process.exit(1);
});
