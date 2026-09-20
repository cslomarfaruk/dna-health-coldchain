/**
 * Cold-Chain Telemetry & Packaging Logistics Service
 *
 * Manages cold-chain packaging compliance, IoT temperature probe readings,
 * excursion detection (2°C - 8°C USP standard), and courier transit ETA.
 */

import { ColdChainTelemetry, CourierAssignment } from '../types/clinical';

export interface CoolerPackage {
  coolerBoxId: string;
  sensorProbeId: string;
  drugName: string;
  rxcui: string;
  targetRangeCelsius: [number, number];
  currentTempCelsius: number;
  packedAt: string;
  courier: CourierAssignment;
  telemetryStatus: 'NOMINAL' | 'EXCURSION_HIGH' | 'EXCURSION_LOW';
}

const COURIER_ROSTER: Array<Omit<CourierAssignment, 'dispatchTime' | 'estimatedArrivalMinutes' | 'destinationFloor' | 'destinationWardFridge'>> = [
  { courierId: 'COUR-409', courierName: 'James M.' },
  { courierId: 'COUR-215', courierName: 'Sarah J.' },
  { courierId: 'COUR-108', courierName: 'Marcus V.' },
];

/**
 * Initializes a validated cold-chain packaging batch for a dispensed medication
 */
export function packageColdChainMedication(
  drugName: string,
  rxcui: string,
  destinationFloor: string,
  transitMinutesEstimate: number = 10
): CoolerPackage {
  const now = new Date();
  const boxIndex = Math.floor(Math.random() * 80) + 10;
  const courierBase = COURIER_ROSTER[Math.floor(Math.random() * COURIER_ROSTER.length)];

  // Calibrated initial packing temperature within 2°C - 8°C safe zone (e.g. 3.4°C to 4.2°C)
  const initialTemp = Number((3.2 + Math.random() * 1.2).toFixed(1));

  const courier: CourierAssignment = {
    courierId: courierBase.courierId,
    courierName: courierBase.courierName,
    dispatchTime: now.toISOString(),
    estimatedArrivalMinutes: transitMinutesEstimate,
    destinationFloor,
    destinationWardFridge: `${destinationFloor.replace(/-?bed-?\d+/gi, '').replace(/-+$/, '')} - Med Fridge Lockbox A`,
  };

  return {
    coolerBoxId: `COOLER-MED-${boxIndex}`,
    sensorProbeId: `IOT-PROBE-${boxIndex * 7}`,
    drugName,
    rxcui,
    targetRangeCelsius: [2.0, 8.0],
    currentTempCelsius: initialTemp,
    packedAt: now.toISOString(),
    courier,
    telemetryStatus: 'NOMINAL',
  };
}

/**
 * Simulates real-time telemetry fluctuations from the thermal cooler's IoT probe
 */
export function pollColdChainTelemetry(currentPackage: CoolerPackage): ColdChainTelemetry {
  // Small random thermal fluctuation (drift of +/- 0.1°C)
  const drift = (Math.random() - 0.5) * 0.2;
  const newTemp = Number(Math.max(1.0, Math.min(10.0, currentPackage.currentTempCelsius + drift)).toFixed(1));

  let status: 'NOMINAL' | 'EXCURSION_HIGH' | 'EXCURSION_LOW' = 'NOMINAL';
  if (newTemp < currentPackage.targetRangeCelsius[0]) {
    status = 'EXCURSION_LOW';
  } else if (newTemp > currentPackage.targetRangeCelsius[1]) {
    status = 'EXCURSION_HIGH';
  }

  return {
    coolerBoxId: currentPackage.coolerBoxId,
    sensorProbeId: currentPackage.sensorProbeId,
    currentTempCelsius: newTemp,
    targetRangeCelsius: currentPackage.targetRangeCelsius,
    batteryPercent: 96,
    lastPingTime: new Date().toISOString(),
    status,
  };
}

// Clean alias
export const packMedication = packageColdChainMedication;

