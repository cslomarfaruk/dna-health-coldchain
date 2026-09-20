import { execSync } from 'child_process';

console.log('====================================================');
console.log(' RUNNING ALL UNIT TESTS (RxNorm, HL7, Reconciliation, PHI)');
console.log('====================================================\n');

try {
  execSync('tsx test/unit/rxnorm.test.ts', { stdio: 'inherit' });
  execSync('tsx test/unit/hl7.test.ts', { stdio: 'inherit' });
  execSync('tsx test/unit/reconciliation.test.ts', { stdio: 'inherit' });
  execSync('tsx test/unit/phiSanitizer.test.ts', { stdio: 'inherit' });
  execSync('tsx test/unit/surgery.test.ts', { stdio: 'inherit' });

  console.log('====================================================');
  console.log(' ALL UNIT TESTS COMPLETED SUCCESSFULLY (100% PASS)');
  console.log('====================================================\n');
} catch (err) {
  console.error('\n✕ UNIT TESTS FAILED');
  process.exit(1);
}
