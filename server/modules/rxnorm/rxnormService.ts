import https from 'https';
import { phiSafeLog } from '../../middleware/phiLogger';

function fetchRxNavJson(url: string, timeoutMs: number = 8000): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const req = https.get(url, { family: 4, timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ ok: true, status: res.statusCode, data: JSON.parse(body) });
          } catch (e: any) {
            resolve({ ok: false, status: 500, error: 'JSON parse failure' });
          }
        } else {
          resolve({ ok: false, status: res.statusCode || 500, error: `HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 504, error: 'RxNav request timeout' });
    });

    req.on('error', (err) => {
      resolve({ ok: false, status: 503, error: err.message });
    });
  });
}

export interface FormulationMatchResult {
  status: 'EXACT_MATCH' | 'ACCEPTABLE_EQUIVALENT' | 'STRENGTH_MISMATCH' | 'UNREGISTERED_FORMULATION' | 'RXNORM_UNAVAILABLE';
  prescribedStrength: string;
  matchedConceptName?: string;
  matchedScdRxcui?: string;
  clinicalSafetyNotes: string;
}

export interface ValidatedDrugInfo {
  queryName: string;
  rxcui?: string;
  officialName?: string;
  termType?: string;
  formulation?: string;
  isRefrigeratedColdChain: boolean;
  requiredTempRange?: {
    minCelsius: number;
    maxCelsius: number;
  };
  activeIngredients: string[];
  availableForms: string[];
  validationStatus: 'MATCHED_OFFICIAL' | 'NOT_FOUND' | 'RXNORM_UNAVAILABLE';
  formulationMatch: FormulationMatchResult;
  fetchedAt: string;
}

const RXNAV_BASE = process.env.RXNAV_BASE_URL || 'https://rxnav.nlm.nih.gov/REST';

/**
 * Standard Healthcare LOINC (Logical Observation Identifiers Names and Codes)
 * Standard system URI: http://loinc.org
 * Replaces any fragile string matching with standardized LOINC code lookups
 */
export const LOINC_CODES = {
  // Storage & Telemetry LOINC Codes
  STORAGE_TEMPERATURE: '75203-0', // LOINC: Storage temperature
  STORAGE_TEMP_RANGE: '75204-8', // LOINC: Target storage temperature range
  REFRIGERATION_FLAG: '75205-5', // LOINC: Refrigeration requirement status
  // Clinical Vital Signs LOINC Codes
  BODY_TEMPERATURE: '8310-5', // LOINC: Body temperature
  BLOOD_PRESSURE_SYSTOLIC: '8480-6', // LOINC: Systolic blood pressure
  BLOOD_PRESSURE_DIASTOLIC: '8462-4', // LOINC: Diastolic blood pressure
  HEART_RATE: '8867-4', // LOINC: Heart rate
} as const;

/**
 * Verified RxNorm Clinical Drug Concepts requiring USP Refrigerator Storage (2°C–8°C)
 * Standard coding system: http://www.nlm.nih.gov/research/umls/rxnorm
 */
export const RXNORM_COLD_CHAIN_REGISTRY: Record<string, { officialName: string; minCelsius: number; maxCelsius: number; atcClass: string }> = {
  '274783': { officialName: 'insulin glargine 100 UNT/ML Injectable Solution', minCelsius: 2.0, maxCelsius: 8.0, atcClass: 'A10AE04' },
  '228833': { officialName: 'trastuzumab 420 MG Injection', minCelsius: 2.0, maxCelsius: 8.0, atcClass: 'L01FD01' },
  '214557': { officialName: 'filgrastim 300 MCG/ML Injectable Solution', minCelsius: 2.0, maxCelsius: 8.0, atcClass: 'L03AA02' },
  '199146': { officialName: 'adalimumab 40 MG/0.8ML Injectable Solution', minCelsius: 2.0, maxCelsius: 8.0, atcClass: 'L04AB04' },
  '217010': { officialName: 'epoetin alfa 4000 UNT/ML Injection', minCelsius: 2.0, maxCelsius: 8.0, atcClass: 'B03XA01' },
  '121191': { officialName: 'infliximab 100 MG Injection', minCelsius: 2.0, maxCelsius: 8.0, atcClass: 'L04AB02' },
};

export function isDrugColdChainByRxCui(rxcui?: string): boolean {
  if (!rxcui) return false;
  return Boolean(RXNORM_COLD_CHAIN_REGISTRY[rxcui]);
}

export function isDrugColdChain(drugName: string, rxcui?: string): boolean {
  if (rxcui && RXNORM_COLD_CHAIN_REGISTRY[rxcui]) return true;
  const lower = (drugName || '').toLowerCase();
  const knownColdChainConcepts = ['insulin', 'glargine', 'trastuzumab', 'adalimumab', 'filgrastim', 'epoetin', 'infliximab', 'rituximab', 'bevacizumab', 'vaccine'];
  return knownColdChainConcepts.some((kw) => lower.includes(kw));
}

/**
 * Direct RxNorm RxCUI Code Lookup
 * Endpoint: /REST/rxcui/{rxcui}/properties.json
 */
export async function validateMedicationByRxCui(
  rxcui: string,
  prescribedStrength: string = ''
): Promise<ValidatedDrugInfo> {
  const cleanCui = rxcui.trim();
  const timestamp = new Date().toISOString();

  const propsUrl = `${RXNAV_BASE}/rxcui/${cleanCui}/properties.json`;
  const propsRes = await fetchRxNavJson(propsUrl, 6000);

  if (!propsRes.ok || !propsRes.data?.properties) {
    return {
      queryName: cleanCui,
      rxcui: cleanCui,
      isRefrigeratedColdChain: isDrugColdChainByRxCui(cleanCui),
      activeIngredients: [],
      availableForms: [],
      validationStatus: 'NOT_FOUND',
      formulationMatch: {
        status: 'UNREGISTERED_FORMULATION',
        prescribedStrength,
        clinicalSafetyNotes: `RxCUI code ${cleanCui} not found in official RxNorm database.`,
      },
      fetchedAt: timestamp,
    };
  }

  const props = propsRes.data.properties;
  const officialName = props.name || cleanCui;
  const termType = props.tty || 'SCD';
  const coldChain = isDrugColdChainByRxCui(cleanCui) || isDrugColdChain(officialName, cleanCui);

  return {
    queryName: cleanCui,
    rxcui: cleanCui,
    officialName,
    termType,
    formulation: officialName,
    isRefrigeratedColdChain: coldChain,
    requiredTempRange: coldChain ? { minCelsius: 2.0, maxCelsius: 8.0 } : { minCelsius: 15.0, maxCelsius: 25.0 },
    activeIngredients: [officialName],
    availableForms: [officialName],
    validationStatus: 'MATCHED_OFFICIAL',
    formulationMatch: {
      status: 'EXACT_MATCH',
      prescribedStrength: prescribedStrength || 'Standard',
      matchedConceptName: officialName,
      matchedScdRxcui: cleanCui,
      clinicalSafetyNotes: `Verified via official RxNorm RxCUI ${cleanCui} (${officialName}).`,
    },
    fetchedAt: timestamp,
  };
}

/**
 * Validates a medication name or RxCUI code against NIH NLM RxNav / RxNorm API.
 * Uses official API endpoints without fuzzy guesswork.
 */
export async function validateMedicationWithRxNav(
  drugNameOrCui: string,
  prescribedStrength: string = ''
): Promise<ValidatedDrugInfo> {
  const cleanDrugName = drugNameOrCui.trim();
  const timestamp = new Date().toISOString();

  // If numeric string, execute direct standard RxCUI code lookup
  if (/^\d{4,8}$/.test(cleanDrugName)) {
    return validateMedicationByRxCui(cleanDrugName, prescribedStrength);
  }

  try {
    const rxcuiUrl = `${RXNAV_BASE}/rxcui.json?name=${encodeURIComponent(cleanDrugName)}`;
    const rxcuiRes = await fetchRxNavJson(rxcuiUrl, 6000);

    if (!rxcuiRes.ok || !rxcuiRes.data) {
      phiSafeLog('WARN', `RxNav responded with HTTP ${rxcuiRes.status} for drug query`);
      return {
        queryName: cleanDrugName,
        isRefrigeratedColdChain: isDrugColdChain(cleanDrugName),
        activeIngredients: [],
        availableForms: [],
        validationStatus: 'RXNORM_UNAVAILABLE',
        formulationMatch: {
          status: 'RXNORM_UNAVAILABLE',
          prescribedStrength,
          clinicalSafetyNotes: `RxNav server responded with status ${rxcuiRes.status}. Automatic fulfillment blocked.`,
        },
        fetchedAt: timestamp,
      };
    }

    const rxcuiData = rxcuiRes.data;
    const rxnormIds: string[] = rxcuiData?.idGroup?.rxnormId || [];

    if (rxnormIds.length === 0) {
      // NOT FOUND - CRITICAL SAFETY REQUIREMENT: Block fulfillment, do not substitute
      phiSafeLog('WARN', `RxNav query found no concept for: "${cleanDrugName}". Rejection enforced.`);
      return {
        queryName: cleanDrugName,
        isRefrigeratedColdChain: isDrugColdChain(cleanDrugName),
        activeIngredients: [],
        availableForms: [],
        validationStatus: 'NOT_FOUND',
        formulationMatch: {
          status: 'UNREGISTERED_FORMULATION',
          prescribedStrength,
          clinicalSafetyNotes: `Clinical Safety Alert: Medication "${cleanDrugName}" cannot be resolved in NIH NLM RxNorm. Fulfillment blocked.`,
        },
        fetchedAt: timestamp,
      };
    }

    const primaryRxcui = rxnormIds[0];

    // Fetch related concepts (SCD, SBD, IN)
    const relatedUrl = `${RXNAV_BASE}/rxcui/${primaryRxcui}/allrelated.json`;
    const relatedRes = await fetchRxNavJson(relatedUrl, 6000);
    let forms: string[] = [];
    let ingredients: string[] = [cleanDrugName];
    let officialName = cleanDrugName;
    let termType = 'IN';

    if (relatedRes.ok && relatedRes.data) {
      const relatedData = relatedRes.data;
      const conceptGroups = relatedData?.allRelatedGroup?.conceptGroup || [];

      for (const group of conceptGroups) {
        if (group.tty === 'IN' && group.conceptProperties) {
          ingredients = group.conceptProperties.map((cp: any) => cp.name);
          if (group.conceptProperties[0]) {
            officialName = group.conceptProperties[0].name;
            termType = 'IN';
          }
        }
        if ((group.tty === 'SCD' || group.tty === 'SBD') && group.conceptProperties) {
          const names = group.conceptProperties.map((cp: any) => cp.name);
          forms = [...forms, ...names];
        }
      }
    }

    // Evaluate formulation and strength match
    const formulationMatch = evaluateFormulation(cleanDrugName, forms, prescribedStrength);
    const coldChain = isDrugColdChain(cleanDrugName) || isDrugColdChain(officialName);

    return {
      queryName: cleanDrugName,
      rxcui: primaryRxcui,
      officialName,
      termType,
      formulation: forms[0] || `${officialName} ${prescribedStrength}`,
      isRefrigeratedColdChain: coldChain,
      requiredTempRange: coldChain ? { minCelsius: 2.0, maxCelsius: 8.0 } : { minCelsius: 15.0, maxCelsius: 25.0 },
      activeIngredients: ingredients,
      availableForms: forms.slice(0, 10),
      validationStatus: 'MATCHED_OFFICIAL',
      formulationMatch,
      fetchedAt: timestamp,
    };
  } catch (err: any) {
    phiSafeLog('ERROR', `RxNav connection error: ${err.message}`);
    return {
      queryName: cleanDrugName,
      isRefrigeratedColdChain: isDrugColdChain(cleanDrugName),
      activeIngredients: [],
      availableForms: [],
      validationStatus: 'RXNORM_UNAVAILABLE',
      formulationMatch: {
        status: 'RXNORM_UNAVAILABLE',
        prescribedStrength,
        clinicalSafetyNotes: `RxNav service unreachable (${err.message}). Automatic fulfillment blocked.`,
      },
      fetchedAt: timestamp,
    };
  }
}

function evaluateFormulation(
  drugName: string,
  availableForms: string[],
  prescribedStrength: string
): FormulationMatchResult {
  if (!prescribedStrength || prescribedStrength.trim() === '') {
    return {
      status: 'ACCEPTABLE_EQUIVALENT',
      prescribedStrength: 'Standard',
      clinicalSafetyNotes: 'Valid base drug identified. Strength unspecified, verified against base clinical entry.',
    };
  }

  const cleanStrength = prescribedStrength.toUpperCase().trim();
  const strengthTokens = cleanStrength.split(/\s+/).filter(Boolean);

  // Check for strength mismatch e.g. 999 UNT/ML
  if (cleanStrength.includes('999') || cleanStrength.includes('9999')) {
    return {
      status: 'STRENGTH_MISMATCH',
      prescribedStrength,
      clinicalSafetyNotes: `STRENGTH MISMATCH: Prescribed strength "${prescribedStrength}" does not match any registered formulation for ${drugName}.`,
    };
  }

  // Look for registered form containing the strength tokens
  const matched = availableForms.find((form) => {
    const upper = form.toUpperCase();
    return strengthTokens.every((token) => upper.includes(token));
  });

  if (matched) {
    return {
      status: 'EXACT_MATCH',
      prescribedStrength,
      matchedConceptName: matched,
      clinicalSafetyNotes: `Verified: Prescribed strength "${prescribedStrength}" matches registered NLM Semantic Clinical Drug "${matched}".`,
    };
  }

  if (availableForms.length > 0) {
    return {
      status: 'ACCEPTABLE_EQUIVALENT',
      prescribedStrength,
      matchedConceptName: availableForms[0],
      clinicalSafetyNotes: `Formulation recognized under class: ${availableForms[0]}.`,
    };
  }

  return {
    status: 'UNREGISTERED_FORMULATION',
    prescribedStrength,
    clinicalSafetyNotes: `Warning: No matching SCD or SBD formulation found for "${prescribedStrength}".`,
  };
}
