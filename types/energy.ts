export type ValidationStatus = 'VALID' | 'INVALID' | 'INCOMPLETE' | 'STALE';

export type TriageCategory =
  | 'ACTIONABLE_ENERGY_WASTE'
  | 'AUTHORIZED_OPERATIONAL_LOAD'
  | 'TELEMETRY_HARDWARE_ERROR'
  | 'UNSURE';

export type HumanDecision =
  | 'APPROVED'
  | 'DISAPPROVED'
  | 'ACKNOWLEDGED'
  | 'MAINTENANCE_DISPATCHED'
  | 'RESOLVED_CUSTOM';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ScenarioType =
  | 'SCENARIO_1_TELEMETRY'
  | 'SCENARIO_2_AUTHORIZED'
  | 'SCENARIO_3_WASTE'
  | 'SCENARIO_4_UNSURE'
  | 'BASELINE_NORMAL';

export interface Building {
  id: string;
  name: string;
  type: 'LECTURE_HALL' | 'RESEARCH_LAB' | 'INFRASTRUCTURE' | 'ADMIN';
  area_sqm: number;
  baseline_kw: number;
  peak_limit_kw: number;
  photo_url: string;
  description: string;
  operational_hours: string;
  current_load_kw: number;
  status: 'NOMINAL' | 'INVESTIGATING' | 'ALERT';
}

export interface MeterReading {
  id: string;
  building_id: string;
  timestamp: string;
  voltage_v: number;
  current_a: number;
  power_factor: number;
  reported_power_kw: number;
  expected_power_kw: number;
  relative_error: number;
  validation_status: ValidationStatus;
  is_quarantined: boolean;
  raw_message?: string;
}

export interface Schedule {
  id: string;
  building_id: string;
  day_of_week: string;
  open_time: string;
  close_time: string;
  hvac_setback_active: boolean;
  notes: string;
}

export interface Occupancy {
  id: string;
  building_id: string;
  timestamp: string;
  headcount: number;
  sensor_status: 'NORMAL' | 'OFFLINE' | 'DEGRADED';
  confidence: number;
}

export interface Equipment {
  id: string;
  building_id: string;
  equipment_name: string;
  category: 'HVAC' | 'LIGHTING' | 'RESEARCH' | 'COMPUTE' | 'UTILITY';
  status: 'ON' | 'OFF' | 'STANDBY' | 'ECO';
  power_draw_kw: number;
  essential: boolean; // Protected Load
  notes: string;
}

export interface MaintenanceNote {
  id: string;
  building_id: string;
  date: string;
  technician: string;
  description: string;
  component_affected: string;
  recalibration_status: 'COMPLETED' | 'PENDING' | 'SCHEDULED';
}

export interface ApprovalRecord {
  id: string;
  building_id: string;
  reference_code: string;
  principal_investigator: string;
  title: string;
  start_time: string;
  end_time: string;
  approved: boolean;
  department: string;
  allowed_equipment: string[];
}

export interface AnomalyRecord {
  id: string;
  building_id: string;
  building_name: string;
  timestamp: string;
  reported_power_kw: number;
  baseline_kw: number;
  deviation_percent: number;
  anomaly_score: number; // 0 to 1
  model_version: string;
  severity: AnomalySeverity;
  physics_status: ValidationStatus;
  is_quarantined: boolean;
  triage_status: 'PENDING' | 'TRIAGED' | 'RESOLVED';
  scenario_type?: ScenarioType;
}

export interface TriageResult {
  id: string;
  anomaly_id: string;
  category: TriageCategory;
  confidence: number; // 0 to 1
  reason: string;
  evidence: string[]; // List of evidence IDs
  recommended_action: string;
  human_review_required: boolean;
  llm_model: string;
  prompt_version: string;
  timestamp: string;
  raw_llm_response?: string;
}

export interface HumanFeedback {
  id: string;
  triage_id: string;
  anomaly_id: string;
  building_id: string;
  prediction: TriageCategory;
  human_decision: HumanDecision;
  reason: string;
  user: string;
  timestamp: string;
  model_version: string;
  prompt_version: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  entity_type: 'READING' | 'ANOMALY' | 'TRIAGE' | 'DECISION' | 'MODEL';
  entity_id: string;
  action: string;
  details: string;
  actor: string;
}

export interface ModelHealthData {
  model_version: string;
  dataset_version: string;
  random_seed: number;
  precision: number;
  recall: number;
  f1: number;
  confusion_matrix: {
    true_positive: number;
    false_positive: number;
    true_negative: number;
    false_negative: number;
  };
  feedback_count: number;
  feedback_agreement_rate: number;
  drift_status: 'NOMINAL' | 'DETECTED' | 'EVALUATING';
  last_evaluation_timestamp: string;
  candidate_model?: {
    model_version: string;
    precision: number;
    recall: number;
    f1: number;
    passed_gate: boolean;
    trained_at: string;
  };
}

export interface BoundedContextPacket {
  anomaly: AnomalyRecord;
  meter: MeterReading;
  schedule?: Schedule;
  occupancy?: Occupancy;
  equipment: Equipment[];
  essential_equipment_present: boolean;
  protected_loads: string[];
  maintenance_notes: MaintenanceNote[];
  approvals: ApprovalRecord[];
  evidence_catalog: {
    id: string;
    type: string;
    summary: string;
  }[];
}
