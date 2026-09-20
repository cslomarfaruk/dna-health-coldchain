import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { prisma } from '../db';
import { FHIR_BASE_URL } from '../modules/fhir/fhirClient';
import { phiSafeLog } from '../middleware/phiLogger';

dotenv.config();

export async function seedDatabase() {
  console.log('Seeding DNA Health Cold-Chain Interoperability database...');

  // 1. Seed RBAC Users
  const passwordSalt = 10;
  const users = [
    {
      username: 'nurse_elizabeth',
      password: 'NursePass123!',
      fullName: 'Nurse Elizabeth Warren, RN',
      role: 'NURSE',
      practitionerId: 'Practitioner/NURSE-0812',
      email: 'elizabeth.warren@hospital.dnahealth.internal',
    },
    {
      username: 'pharm_vance',
      password: 'PharmPass123!',
      fullName: 'Dr. Marcus Vance, PharmD',
      role: 'PHARMACIST',
      practitionerId: 'Practitioner/PHARM-4401',
      email: 'marcus.vance@hospital.dnahealth.internal',
    },
    {
      username: 'auditor_chen',
      password: 'AuditPass123!',
      fullName: 'Auditor Arthur Chen, CISA',
      role: 'AUDITOR',
      practitionerId: 'Practitioner/AUDIT-1029',
      email: 'arthur.chen@hospital.dnahealth.internal',
    },
    {
      username: 'admin_sys',
      password: 'AdminPass123!',
      fullName: 'Hospital Systems Administrator',
      role: 'ADMIN',
      practitionerId: 'Practitioner/ADMIN-0001',
      email: 'admin@hospital.dnahealth.internal',
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, passwordSalt);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, fullName: u.fullName, role: u.role, practitionerId: u.practitionerId },
      create: {
        username: u.username,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        practitionerId: u.practitionerId,
        email: u.email,
      },
    });
    console.log(`  ✓ User seeded: ${u.username} (${u.role})`);
  }

  const nurse = await prisma.user.findUnique({ where: { username: 'nurse_elizabeth' } });

  // 2. Seed Synthetic Medication Indents
  const indents = [
    {
      indentNumber: 'IND-2026-9042',
      patientMrn: 'MRN-849201',
      patientName: 'WARREN, ELIZABETH',
      requestedDrugName: 'Insulin Glargine',
      requestedDose: '100',
      requestedUnits: 'UNIT',
      formulation: '100 UNT/ML Injectable Solution',
      route: 'Subcutaneous',
      priority: 'ROUTINE',
      coldChainRequired: true,
      ward: 'Ward 4B',
      bed: 'Bed 12',
      status: 'PENDING',
      nurseId: nurse?.id,
    },
    {
      indentNumber: 'IND-2026-9043-WRONG-DOSE',
      patientMrn: 'MRN-849201',
      patientName: 'WARREN, ELIZABETH',
      requestedDrugName: 'Insulin Glargine',
      requestedDose: '999', // Critical mismatch: 999 UNIT vs 100 UNIT
      requestedUnits: 'UNIT',
      formulation: '999 UNT/ML Injectable Solution',
      route: 'Subcutaneous',
      priority: 'STAT',
      coldChainRequired: true,
      ward: 'Ward 4B',
      bed: 'Bed 12',
      status: 'PENDING',
      nurseId: nurse?.id,
    },
    {
      indentNumber: 'IND-2026-9044-WRONG-MED',
      patientMrn: 'MRN-849201',
      patientName: 'WARREN, ELIZABETH',
      requestedDrugName: 'Trastuzumab', // Critical mismatch: Trastuzumab vs Insulin
      requestedDose: '420',
      requestedUnits: 'MG',
      formulation: '420 MG Lyophilized Powder for Injection',
      route: 'Intravenous',
      priority: 'ROUTINE',
      coldChainRequired: true,
      ward: 'Ward 4B',
      bed: 'Bed 12',
      status: 'PENDING',
      nurseId: nurse?.id,
    },
  ];

  for (const ind of indents) {
    await prisma.medicationIndent.upsert({
      where: { indentNumber: ind.indentNumber },
      update: ind,
      create: ind,
    });
    console.log(`  ✓ Indent seeded: ${ind.indentNumber}`);
  }

  // 3. Upload Synthetic Patients and MedicationRequest resources to HAPI FHIR server so GET queries work
  console.log(`Checking HAPI FHIR server at ${FHIR_BASE_URL}...`);

  const syntheticPatients = [
    {
      resourceType: 'Patient',
      id: 'MRN-849201',
      name: [{ family: 'Warren', given: ['Elizabeth'] }],
      gender: 'female',
    },
    {
      resourceType: 'Patient',
      id: 'MRN-719302',
      name: [{ family: 'Adams', given: ['Clara'] }],
      gender: 'female',
    },
  ];

  for (const pat of syntheticPatients) {
    try {
      await fetch(`${FHIR_BASE_URL}/Patient/${pat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
        body: JSON.stringify(pat),
      });
      console.log(`  ✓ Synced Patient to HAPI FHIR: Patient/${pat.id}`);
    } catch (err: any) {
      console.log(`  ! Notice: Could not upload patient to HAPI FHIR: ${err.message}`);
    }
  }

  const syntheticPractitioners = [
    {
      resourceType: 'Practitioner',
      id: 'PHARM-4401',
      name: [{ family: 'Vance', given: ['Marcus'] }],
    },
    {
      resourceType: 'Practitioner',
      id: 'NURSE-0812',
      name: [{ family: 'Warren', given: ['Elizabeth'] }],
    },
  ];

  for (const prac of syntheticPractitioners) {
    try {
      await fetch(`${FHIR_BASE_URL}/Practitioner/${prac.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
        body: JSON.stringify(prac),
      });
      console.log(`  ✓ Synced Practitioner to HAPI FHIR: Practitioner/${prac.id}`);
    } catch (err: any) {
      console.log(`  ! Notice: Could not upload practitioner to HAPI FHIR: ${err.message}`);
    }
  }

  // Sync Device resource for AuditEvent observer referential integrity
  try {
    await fetch(`${FHIR_BASE_URL}/Device/inpatient-dispensary-server`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
      body: JSON.stringify({
        resourceType: 'Device',
        id: 'inpatient-dispensary-server',
        status: 'active',
        manufacturer: 'DNA Health Systems',
        deviceName: [{ name: 'Inpatient Cold Chain Dispensary Gateway', type: 'user-friendly-name' }],
      }),
    });
    console.log(`  ✓ Synced Device to HAPI FHIR: Device/inpatient-dispensary-server`);
  } catch (err: any) {
    console.log(`  ! Notice: Could not upload device to HAPI FHIR: ${err.message}`);
  }

  const fhirMedRequests = [
    {
      resourceType: 'MedicationRequest',
      id: 'medreq-ord-2026-9042',
      identifier: [
        {
          system: 'http://hospital.dnahealth.internal/orders',
          value: 'ORD-2026-9042',
          use: 'official',
        },
      ],
      status: 'active',
      intent: 'order',
      priority: 'routine',
      medicationCodeableConcept: {
        coding: [
          {
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '274783',
            display: 'insulin glargine 100 UNT/ML Injectable Solution',
          },
        ],
        text: 'Insulin Glargine 100 UNT/ML (100 UNIT)',
      },
      subject: {
        reference: 'Patient/MRN-849201',
        display: 'WARREN, ELIZABETH',
      },
      authoredOn: '2026-09-16T09:30:00Z',
      dosageInstruction: [
        {
          text: '100 UNIT Subcutaneously once daily at bedtime',
          route: {
            coding: [{ system: 'http://ncimeta.nci.nih.gov', code: 'SC', display: 'Subcutaneous' }],
            text: 'Subcutaneous',
          },
          doseAndRate: [
            {
              doseQuantity: {
                value: 100,
                unit: 'UNIT',
                system: 'http://unitsofmeasure.org',
                code: 'UNIT',
              },
            },
          ],
        },
      ],
    },
    {
      resourceType: 'MedicationRequest',
      id: 'medreq-ord-2026-9043',
      identifier: [
        {
          system: 'http://hospital.dnahealth.internal/orders',
          value: 'ORD-2026-9043',
          use: 'official',
        },
      ],
      status: 'active',
      intent: 'order',
      priority: 'routine',
      medicationCodeableConcept: {
        coding: [
          {
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '228833',
            display: 'trastuzumab 420 MG Injection',
          },
        ],
        text: 'Trastuzumab 420 MG IV infusion',
      },
      subject: {
        reference: 'Patient/MRN-719302',
        display: 'ADAMS, CLARA',
      },
      authoredOn: '2026-09-16T08:15:00Z',
      dosageInstruction: [
        {
          text: '420 MG IV infusion',
          route: {
            coding: [{ system: 'http://ncimeta.nci.nih.gov', code: 'IV', display: 'Intravenous' }],
            text: 'Intravenous',
          },
          doseAndRate: [
            {
              doseQuantity: {
                value: 420,
                unit: 'MG',
                system: 'http://unitsofmeasure.org',
                code: 'MG',
              },
            },
          ],
        },
      ],
    },
  ];

  for (const req of fhirMedRequests) {
    try {
      const putRes = await fetch(`${FHIR_BASE_URL}/MedicationRequest/${req.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
        },
        body: JSON.stringify(req),
      });

      if (putRes.ok || putRes.status === 201 || putRes.status === 200) {
        console.log(`  ✓ Synced to HAPI FHIR: MedicationRequest/${req.id}`);
      } else {
        console.log(`  ! HAPI FHIR returned ${putRes.status} for MedicationRequest/${req.id}`);
      }
    } catch (err: any) {
      console.log(`  ! Notice: Could not upload to HAPI FHIR: ${err.message}`);
    }
  }

  console.log('Database seeding complete.\n');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
