"""
Pydantic Schemas for Campus Energy Triage System
Strict typing and validation for API and LLM contracts.
"""

from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class TriageCategory(str, Enum):
    ACTIONABLE_ENERGY_WASTE = "ACTIONABLE_ENERGY_WASTE"
    AUTHORIZED_OPERATIONAL_LOAD = "AUTHORIZED_OPERATIONAL_LOAD"
    TELEMETRY_HARDWARE_ERROR = "TELEMETRY_HARDWARE_ERROR"
    UNSURE = "UNSURE"

class HumanDecisionEnum(str, Enum):
    APPROVED = "APPROVED"
    DISAPPROVED = "DISAPPROVED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    MAINTENANCE_DISPATCHED = "MAINTENANCE_DISPATCHED"
    RESOLVED_CUSTOM = "RESOLVED_CUSTOM"

class LLMTriageOutput(BaseModel):
    category: TriageCategory = Field(
        ..., description="Classification: ACTIONABLE_ENERGY_WASTE, AUTHORIZED_OPERATIONAL_LOAD, TELEMETRY_HARDWARE_ERROR, or UNSURE"
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level between 0 and 1")
    reason: str = Field(..., min_length=10, description="Explanation grounded in provided evidence IDs")
    evidence: List[str] = Field(..., min_items=1, description="List of evidence IDs supporting the verdict")
    recommended_action: str = Field(..., description="Actionable recommendation preserving protected loads")
    human_review_required: bool = Field(True, description="Must always require human review")

class TriageDecisionRequest(BaseModel):
    decision: HumanDecisionEnum
    reason: Optional[str] = None
    user: Optional[str] = "facilities.operator@campus.edu"

class ModelRetrainResponse(BaseModel):
    previous_model: str
    candidate_model: str
    gate_passed: bool
    metrics: Dict[str, float]
    message: str
