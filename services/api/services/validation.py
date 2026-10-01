"""
Physics Validation Service - Deterministic First Line of Defense
Campus Energy Triage System
Rule: Expected Power ≈ V × I × Power Factor
Relative Error = |Reported - Expected| / Expected
Invalid readings MUST be quarantined and NEVER enter ML anomaly detection.
"""

from typing import Dict, Any, Optional
from enum import Enum

class ValidationStatus(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"
    INCOMPLETE = "INCOMPLETE"
    STALE = "STALE"

class PhysicsValidator:
    DEFAULT_POWER_FACTOR: float = 0.95
    ERROR_TOLERANCE: float = 0.15  # 15% engineering tolerance

    @classmethod
    def validate_reading(
        cls,
        voltage_v: Optional[float],
        current_a: Optional[float],
        reported_power_kw: Optional[float],
        power_factor: Optional[float] = None,
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validates electrical conservation of energy.
        Expected Power (kW) = (V * I * PF) / 1000
        """
        # 1. Completeness validation
        if voltage_v is None or current_a is None or reported_power_kw is None:
            return {
                "expected_power_kw": 0.0,
                "relative_error": 1.0,
                "validation_status": ValidationStatus.INCOMPLETE,
                "is_quarantined": True,
                "explanation": "Missing required telemetry channels (V, I, or P reported). Reading quarantined."
            }

        pf = power_factor if (power_factor and 0 < power_factor <= 1.0) else cls.DEFAULT_POWER_FACTOR
        expected_kw = (voltage_v * current_a * pf) / 1000.0

        # Zero-current boundary check
        if expected_kw <= 0.001:
            if reported_power_kw > 0.1:
                return {
                    "expected_power_kw": 0.0,
                    "relative_error": 1.0,
                    "validation_status": ValidationStatus.INVALID,
                    "is_quarantined": True,
                    "explanation": f"Near-zero current ({current_a} A) with non-zero reported power ({reported_power_kw} kW). Violates conservation of energy."
                }
            return {
                "expected_power_kw": 0.0,
                "relative_error": 0.0,
                "validation_status": ValidationStatus.VALID,
                "is_quarantined": False,
                "explanation": "Zero power verified consistent with zero current draw."
            }

        relative_error = abs(reported_power_kw - expected_kw) / expected_kw

        if relative_error > cls.ERROR_TOLERANCE:
            pct = round(relative_error * 100, 1)
            return {
                "expected_power_kw": round(expected_kw, 3),
                "relative_error": round(relative_error, 4),
                "validation_status": ValidationStatus.INVALID,
                "is_quarantined": True,
                "explanation": f"Reported power {reported_power_kw} kW differs from physics expected {round(expected_kw, 3)} kW by {pct}%. Exceeds {cls.ERROR_TOLERANCE * 100}% tolerance. QUARANTINED."
            }

        return {
            "expected_power_kw": round(expected_kw, 3),
            "relative_error": round(relative_error, 4),
            "validation_status": ValidationStatus.VALID,
            "is_quarantined": False,
            "explanation": f"Physical validation passed: Reported {reported_power_kw} kW matches expected {round(expected_kw, 3)} kW within {round(relative_error * 100, 1)}% variance."
        }
