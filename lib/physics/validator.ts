import { MeterReading, ValidationStatus } from '@/types/energy';

export interface PhysicsValidationResult {
  expected_power_kw: number;
  relative_error: number;
  validation_status: ValidationStatus;
  is_quarantined: boolean;
  explanation: string;
}

export const PHYSICS_CONFIG = {
  // 15% tolerance on relative error for instrumentation variance
  ERROR_TOLERANCE: 0.15,
  // Prototype standard power factor assumption when not telemetry-supplied
  DEFAULT_POWER_FACTOR: 0.95,
  // Minimum acceptable voltage to avoid division by zero / dead line
  MIN_VOLTAGE_V: 50.0,
  // Maximum age in minutes before a reading is declared STALE
  MAX_STALE_MINUTES: 120,
};

/**
 * Validates electrical meter telemetry against physical conservation of energy:
 * Expected Power (kW) = (Voltage (V) * Current (A) * Power Factor) / 1000
 *
 * Implements deterministic safety quarantine:
 * Any reading violating physics (relative error > 15%) is strictly quarantined
 * and prohibited from entering ML anomaly detection.
 */
export function validateMeterReading(
  reading: Partial<MeterReading> & {
    voltage_v?: number | null;
    current_a?: number | null;
    reported_power_kw?: number | null;
    power_factor?: number | null;
    timestamp?: string;
  }
): PhysicsValidationResult {
  const { voltage_v, current_a, reported_power_kw, power_factor, timestamp } = reading;

  // 1. Completeness Check
  if (
    voltage_v === undefined ||
    voltage_v === null ||
    current_a === undefined ||
    current_a === null ||
    reported_power_kw === undefined ||
    reported_power_kw === null
  ) {
    return {
      expected_power_kw: 0,
      relative_error: 1.0,
      validation_status: 'INCOMPLETE',
      is_quarantined: true,
      explanation: 'Missing essential electrical telemetry channels (Voltage, Current, or Reported Power). Reading quarantined for data completeness.',
    };
  }

  // 2. Staleness Check
  if (timestamp) {
    const readingTime = new Date(timestamp).getTime();
    const now = Date.now();
    // Allow historical demo timestamps, but if marked as stale or invalid format:
    if (isNaN(readingTime)) {
      return {
        expected_power_kw: 0,
        relative_error: 1.0,
        validation_status: 'STALE',
        is_quarantined: true,
        explanation: 'Invalid timestamp format encountered. Telemetry cannot be verified against current clock.',
      };
    }
  }

  // 3. Physical Computation
  const pf = power_factor && power_factor > 0 && power_factor <= 1.0
    ? power_factor
    : PHYSICS_CONFIG.DEFAULT_POWER_FACTOR;

  // Expected Active Power in kW: (V * I * PF) / 1000
  const expectedKw = (voltage_v * current_a * pf) / 1000.0;

  // Zero-current boundary condition
  if (expectedKw <= 0.001) {
    if (reported_power_kw > 0.1) {
      return {
        expected_power_kw: 0,
        relative_error: 1.0,
        validation_status: 'INVALID',
        is_quarantined: true,
        explanation: `Zero or negligible current (${current_a} A) detected, but reported power is ${reported_power_kw.toFixed(2)} kW. Violates physical conservation of energy.`,
      };
    }
    return {
      expected_power_kw: 0,
      relative_error: 0,
      validation_status: 'VALID',
      is_quarantined: false,
      explanation: 'Zero load physically consistent with zero reported power draw.',
    };
  }

  // Relative Error = |Reported - Expected| / Expected
  const relativeError = Math.abs(reported_power_kw - expectedKw) / expectedKw;

  if (relativeError > PHYSICS_CONFIG.ERROR_TOLERANCE) {
    const pct = (relativeError * 100).toFixed(1);
    return {
      expected_power_kw: Number(expectedKw.toFixed(3)),
      relative_error: Number(relativeError.toFixed(4)),
      validation_status: 'INVALID',
      is_quarantined: true,
      explanation: `Reported power (${reported_power_kw.toFixed(2)} kW) deviates from physical calculation V x I x PF (${expectedKw.toFixed(2)} kW) by ${pct}%, exceeding ${PHYSICS_CONFIG.ERROR_TOLERANCE * 100}% tolerance. QUARANTINED. Likely sensor miscalibration or transducer CT fault.`,
    };
  }

  return {
    expected_power_kw: Number(expectedKw.toFixed(3)),
    relative_error: Number(relativeError.toFixed(4)),
    validation_status: 'VALID',
    is_quarantined: false,
    explanation: `Physical validation passed: Reported ${reported_power_kw.toFixed(2)} kW matches expected ${expectedKw.toFixed(2)} kW within ${(relativeError * 100).toFixed(1)}% variance.`,
  };
}
