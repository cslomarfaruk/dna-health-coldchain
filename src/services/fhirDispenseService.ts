// Builds FHIR R4 MedicationRequest and MedicationDispense resources.
// Includes cold-chain extensions and courier tracking metadata.

import {
  FhirMedicationRequest,
  FhirMedicationDispense,
  ValidatedDrugInfo,
  Omp09ParsedOrder
} from '../types/clinical';
import { CoolerPackage } from './coldChainService';

const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';
const HOSPITAL_IDENTIFIER_SYSTEM = 'http://hospital.dnahealth.internal/orders';

/**
 * Creates an HL7 FHIR R4 MedicationRequest representing the doctor's EHR order
 */
export function buildFhirMedicationRequest(
  parsedOrder: Omp09ParsedOrder,
  validatedDrug: ValidatedDrugInfo
): FhirMedicationRequest {
  const reqId = `medreq-${parsedOrder.orc.placerOrderNumber.toLowerCase()}`;

  return {
    resourceType: 'MedicationRequest',
    id: reqId,
    identifier: [
      {
        system: HOSPITAL_IDENTIFIER_SYSTEM,
        value: parsedOrder.orc.placerOrderNumber,
        use: 'official',
      },
    ],
    status: 'active',
    intent: 'order',
    priority: parsedOrder.orc.orderControl === 'STAT' ? 'stat' : 'routine',
    medicationCodeableConcept: {
      coding: [
        {
          system: RXNORM_SYSTEM,
          code: validatedDrug.rxcui,
          display: validatedDrug.officialName,
        },
      ],
      text: `${validatedDrug.officialName} (${parsedOrder.rxo.requestedGiveAmount} ${parsedOrder.rxo.requestedGiveUnits})`,
    },
    subject: {
      reference: `Patient/${parsedOrder.pid.patientId}`,
      display: parsedOrder.pid.patientName,
    },
    authoredOn: parsedOrder.orc.dateTimeOfTransaction || parsedOrder.parsedAt,
    requester: {
      reference: `Practitioner/${(parsedOrder.pv1.attendingDoctor || 'attending-md').replace(/\s+/g, '-').toLowerCase()}`,
      display: parsedOrder.pv1.attendingDoctor || 'Attending Physician',
    },
    dosageInstruction: [
      {
        text: `${parsedOrder.rxo.requestedGiveAmount} ${parsedOrder.rxo.requestedGiveUnits} via ${parsedOrder.rxr.routeName}`,
        route: {
          coding: [
            {
              system: 'http://ncimeta.nci.nih.gov',
              code: parsedOrder.rxr.routeCode,
              display: parsedOrder.rxr.routeName,
            },
          ],
          text: parsedOrder.rxr.routeName,
        },
        doseAndRate: [
          {
            doseQuantity: {
              value: parseFloat(parsedOrder.rxo.requestedGiveAmount) || 1,
              unit: parsedOrder.rxo.requestedGiveUnits,
              system: 'http://unitsofmeasure.org',
              code: parsedOrder.rxo.requestedGiveUnits,
            },
          },
        ],
      },
    ],
    note: [
      {
        text: validatedDrug.isRefrigeratedColdChain
          ? 'COLD CHAIN ALERT: Temperature-sensitive medication. Requires refrigerated storage (2°C - 8°C).'
          : 'Standard hospital pharmacy distribution.',
      },
    ],
  };
}

/**
 * Creates an HL7 FHIR R4 MedicationDispense record when medication is packed and courier leaves
 */
export function buildFhirMedicationDispense(
  medicationRequest: FhirMedicationRequest,
  coolerPackage: CoolerPackage,
  dispensingPharmacist: string = 'Dr. Marcus Vance, PharmD'
): FhirMedicationDispense {
  const dispenseId = `disp-${medicationRequest.id.replace('medreq-', '')}`;
  const now = new Date();
  const etaDate = new Date(now.getTime() + coolerPackage.courier.estimatedArrivalMinutes * 60000);

  return {
    resourceType: 'MedicationDispense',
    id: dispenseId,
    identifier: [
      {
        system: `${HOSPITAL_IDENTIFIER_SYSTEM}/dispense`,
        value: `DISP-${coolerPackage.coolerBoxId}`,
        use: 'official',
      },
    ],
    status: 'in-progress',
    medicationCodeableConcept: medicationRequest.medicationCodeableConcept,
    subject: medicationRequest.subject,
    authorizingPrescription: [
      {
        reference: `MedicationRequest/${medicationRequest.id}`,
        display: `Order ${medicationRequest.identifier?.[0]?.value || medicationRequest.id}`,
      },
    ],
    performer: [
      {
        actor: {
          reference: 'Organization/dna-health-central-pharmacy',
          display: 'DNA Health Central Inpatient Pharmacy',
        },
      },
      {
        actor: {
          reference: 'Practitioner/pharm-0912',
          display: dispensingPharmacist,
        },
      },
    ],
    location: {
      reference: `Location/${coolerPackage.courier.destinationFloor.replace(/\s+/g, '-').toLowerCase()}`,
      display: coolerPackage.courier.destinationFloor,
    },
    quantity: {
      value: 1,
      unit: 'Package',
      system: 'http://unitsofmeasure.org',
      code: '{Package}',
    },
    whenPrepared: coolerPackage.packedAt,
    whenHandedOver: coolerPackage.courier.dispatchTime,
    extension: [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/pharmacy-cold-chain-temp-range',
        valueString: `${coolerPackage.targetRangeCelsius[0]}°C - ${coolerPackage.targetRangeCelsius[1]}°C`,
      },
      {
        url: 'http://hl7.org/fhir/StructureDefinition/pharmacy-initial-cooler-temp',
        valueDecimal: coolerPackage.currentTempCelsius,
      },
      {
        url: 'http://hl7.org/fhir/StructureDefinition/pharmacy-courier-assignment',
        valueString: `${coolerPackage.courier.courierName} (ID: ${coolerPackage.courier.courierId})`,
      },
      {
        url: 'http://hl7.org/fhir/StructureDefinition/pharmacy-courier-eta',
        valueDateTime: etaDate.toISOString(),
      },
      {
        url: 'http://hl7.org/fhir/StructureDefinition/pharmacy-cooler-box-id',
        valueString: coolerPackage.coolerBoxId,
      },
    ],
    note: [
      {
        text: `Packed in validated thermal carrier ${coolerPackage.coolerBoxId} with probe ${coolerPackage.sensorProbeId}. Dispatched via courier ${coolerPackage.courier.courierName}. Estimated floor arrival in ${coolerPackage.courier.estimatedArrivalMinutes} minutes. Immediate transfer to ward medication refrigerator required.`,
      },
    ],
  };
}

// Clean aliases
export const buildMedRequest = buildFhirMedicationRequest;
export const buildDispense = buildFhirMedicationDispense;

