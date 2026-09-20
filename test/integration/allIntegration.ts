import { execSync } from 'child_process';

console.log('====================================================');
console.log(' RUNNING ALL INTEGRATION TESTS (Auth/RBAC, FHIR, Idempotency)');
console.log('====================================================\n');

try {
  execSync('tsx test/integration/authRbac.test.ts', { stdio: 'inherit' });
  execSync('tsx test/integration/smartOAuth.test.ts', { stdio: 'inherit' });
  execSync('tsx test/integration/fhirIntegration.test.ts', { stdio: 'inherit' });
  execSync('tsx test/integration/idempotency.test.ts', { stdio: 'inherit' });
  execSync('tsx test/integration/distributedConsistency.test.ts', { stdio: 'inherit' });
  execSync('tsx test/integration/surgeryIntegration.test.ts', { stdio: 'inherit' });

  console.log('====================================================');
  console.log(' ALL INTEGRATION TESTS COMPLETED (100% PASS)');
  console.log('====================================================\n');
} catch (err) {
  console.error('\n✕ INTEGRATION TESTS FAILED');
  process.exit(1);
}
