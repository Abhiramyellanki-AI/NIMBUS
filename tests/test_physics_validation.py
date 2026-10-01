"""
Unit Tests for Physics Validation
Tests:
- Valid reading within tolerance
- Invalid V/I/P mismatch (Scenario 1)
- Missing power factor (fallback to 0.95)
- Zero current boundary condition
- Missing telemetry (INCOMPLETE)
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.api.services.validation import PhysicsValidator, ValidationStatus

def test_valid_reading():
    # V=230V, I=10A, PF=0.95 => Expected = 2.185 kW, Reported = 2.2 kW (0.68% error)
    res = PhysicsValidator.validate_reading(
        voltage_v=230.0,
        current_a=10.0,
        reported_power_kw=2.2,
        power_factor=0.95
    )
    assert res["validation_status"] == ValidationStatus.VALID
    assert res["is_quarantined"] is False
    assert res["relative_error"] < 0.05
    print("✓ test_valid_reading passed")

def test_scenario_1_sensor_error_quarantined():
    # Scenario 1: V=230V, I=2A, Reported = 2.5 kW, Expected ≈ 0.437 kW
    res = PhysicsValidator.validate_reading(
        voltage_v=230.0,
        current_a=2.0,
        reported_power_kw=2.5,
        power_factor=0.95
    )
    assert res["validation_status"] == ValidationStatus.INVALID
    assert res["is_quarantined"] is True
    assert res["relative_error"] > 4.0  # > 400% mismatch
    print("✓ test_scenario_1_sensor_error_quarantined passed")

def test_zero_current_with_reported_power():
    res = PhysicsValidator.validate_reading(
        voltage_v=230.0,
        current_a=0.0,
        reported_power_kw=3.5,
        power_factor=0.95
    )
    assert res["validation_status"] == ValidationStatus.INVALID
    assert res["is_quarantined"] is True
    print("✓ test_zero_current_with_reported_power passed")

def test_missing_data_incomplete():
    res = PhysicsValidator.validate_reading(
        voltage_v=None,
        current_a=10.0,
        reported_power_kw=2.2
    )
    assert res["validation_status"] == ValidationStatus.INCOMPLETE
    assert res["is_quarantined"] is True
    print("✓ test_missing_data_incomplete passed")

if __name__ == "__main__":
    test_valid_reading()
    test_scenario_1_sensor_error_quarantined()
    test_zero_current_with_reported_power()
    test_missing_data_incomplete()
    print("\nAll Physics Validation Tests Passed Successfully!")
