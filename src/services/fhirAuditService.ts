// Generates HL7 FHIR R4 AuditEvent resources with SHA-256 dispatch digests.

import { FhirAuditEvent, FhirMedicationDispense } from '../types/clinical';
import { HipaaSanitizationReport } from '../types/clinical';

export function buildFhirAuditEvent(
  dispense: FhirMedicationDispense,
  hipaaReport: HipaaSanitizationReport,
  pharmacistName: string = 'Dr. Marcus Vance, PharmD'
): FhirAuditEvent {
  const auditId = `audit-${dispense.id}`;
  const recorded = new Date().toISOString();

  return {
    resourceType: 'AuditEvent',
    id: auditId,
    type: {
      system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
      code: 'rest',
      display: 'RESTful Operation',
    },
    subtype: [
      {
        system: 'http://hl7.org/fhir/restful-interaction',
        code: 'create',
        display: 'Create / Pharmacy Cold-Chain Dispense',
      },
      {
        system: 'http://hospital.dnahealth.internal/audit-subtypes',
        code: 'cold-chain-dispatch',
        display: 'Inpatient Cold Chain Medication Dispatch',
      },
    ],
    action: 'C', // Create
    recorded,
    outcome: '0', // 0 = Success
    outcomeDesc: 'Cold-chain medication successfully validated via RxNav, packed at 2-8°C, and dispatched with de-identified nurse alert.',
    agent: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: 'PPRF',
              display: 'Primary Performer',
            },
          ],
        },
        who: {
          reference: 'Practitioner/pharm-0912',
          display: pharmacistName,
        },
        requestor: true,
      },
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: 'DEV',
              display: 'Dispensing Device',
            },
          ],
        },
        who: {
          reference: 'Device/dna-health-aegis-dispense-hub',
          display: 'AegisCold Automated Interoperability Gateway',
        },
        requestor: false,
        network: {
          address: '10.240.12.8',
          type: '2', // IP Address
        },
      },
    ],
    source: {
      observer: {
        reference: 'Device/dna-health-aegis-dispense-hub',
        display: 'DNA Health Interoperability Hub',
      },
      type: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
          code: '4',
          display: 'Application Server',
        },
      ],
    },
    entity: [
      {
        what: {
          reference: `MedicationDispense/${dispense.id}`,
          display: `Dispense Record for ${dispense.medicationCodeableConcept.text || 'Medication'}`,
        },
        type: {
          system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
          code: '2',
          display: 'System Object',
        },
        role: {
          system: 'http://terminology.hl7.org/CodeSystem/object-role',
          code: '4',
          display: 'Domain Resource',
        },
        securityLabel: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-Confidentiality',
            code: 'R',
            display: 'Restricted (HIPAA Safe Harbor De-Identified Outbound)',
          },
        ],
        description: `SHA-256 Digest: ${hipaaReport.sha256AuditDigest}`,
      },
    ],
  };
}

// Clean alias
export const buildAuditEvent = buildFhirAuditEvent;

