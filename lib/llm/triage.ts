import { BoundedContextPacket, TriageCategory, TriageResult } from '@/types/energy';

export const PROMPT_VERSION = 'v2.1.0-grounded-safety';

export interface LLMTriageResponse {
  category: TriageCategory;
  confidence: number;
  reason: string;
  evidence: string[];
  recommended_action: string;
  human_review_required: boolean;
}

const SYSTEM_INSTRUCTION = `You are a campus energy anomaly triage AI specialist.
Your role is to reason over telemetry, facilities schedules, occupancy, maintenance logs, and research approvals to classify campus energy anomalies into exactly one of four categories:
1. ACTIONABLE_ENERGY_WASTE: Avoidable energy consumption supported by verified evidence (e.g. empty building with active cooling and no approved activity).
2. AUTHORIZED_OPERATIONAL_LOAD: High consumption justified by a valid approved activity, research experiment, or scheduled facility operation.
3. TELEMETRY_HARDWARE_ERROR: Sensor fault, transducer ratio error, or physically inconsistent telemetry.
4. UNSURE: Evidence is incomplete, conflicting, missing (e.g. offline occupancy sensors), or ambiguous.

CRITICAL SAFETY RULES:
- Use ONLY the supplied evidence items. Do NOT invent missing facts or assume conditions not stated.
- Do NOT assume that high energy or an anomaly is automatically waste.
- NEVER recommend shutting down or interfering with protected/essential loads (marked as essential=true).
- If evidence is missing, conflicting, or occupancy data is unavailable, you MUST return UNSURE.
- Every claim in your reason MUST correspond to an evidence ID in the "evidence" array.
- human_review_required MUST ALWAYS be true. An AI recommendation must never trigger automated equipment control.
- Return ONLY valid JSON adhering to the specified schema.`;

/**
 * Executes the complete AI triage pipeline with safety gates and deterministic fallbacks.
 */
export async function executeLLMTriage(
  context: BoundedContextPacket
): Promise<TriageResult> {
  const anomaly = context.anomaly;
  const meter = context.meter;
  const triageId = `triage_${anomaly.id}_${Date.now()}`;

  // SAFETY GATE 1: Physics validation failure bypasses LLM
  // Section 7 & 11: Invalid telemetry must be quarantined and never classified as waste!
  if (anomaly.physics_status === 'INVALID' || meter.validation_status === 'INVALID' || meter.is_quarantined) {
    return {
      id: triageId,
      anomaly_id: anomaly.id,
      category: 'TELEMETRY_HARDWARE_ERROR',
      confidence: 0.98,
      reason: `Physical validation failure quarantined this reading: Reported power (${meter.reported_power_kw} kW) severely disagrees with measured V x I (${meter.expected_power_kw} kW, relative error ${(meter.relative_error * 100).toFixed(1)}%). Electrical conservation of energy is violated.`,
      evidence: [meter.id, ...(context.maintenance_notes.map((m) => m.id))],
      recommended_action: 'Issue high-priority work order for electrical instrumentation technician to test CT clamp, sensor calibration, and potential meter phase fault.',
      human_review_required: true,
      llm_model: 'deterministic-physics-safety-gate',
      prompt_version: PROMPT_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  // Removed SAFETY GATE 2 so the LLM has a chance to analyze missing occupancy


  // Attempt server-side Gemini generation if GEMINI_API_KEY is available
  try {
    const res = await fetch('http://127.0.0.1:8000/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: JSON.stringify(context) })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    return {
      id: triageId,
      anomaly_id: anomaly.id,
      category: data.category,
      confidence: data.confidence,
      reason: data.reason,
      evidence: data.evidence || [meter.id],
      recommended_action: data.recommended_action,
      human_review_required: data.human_review_required,
      llm_model: 'python-fastapi-gemini',
      prompt_version: 'v3.0.0-python',
      timestamp: new Date().toISOString(),
      raw_llm_response: JSON.stringify(data),
    };
  } catch (error) {
    console.error("FastAPI backend not running or failed", error);
    return generateDeterministicTriage(context, triageId, 'python-fastapi-gemini (failsafe fallback)');
  }
}

/**
 * Deterministic fallback triage that implements the exact decision rules
 * specified in the PRD, ensuring 100% testable and reliable behavior.
 */
export function generateDeterministicTriage(
  context: BoundedContextPacket,
  triageId: string,
  modelTag: string
): TriageResult {
  const anomaly = context.anomaly;
  const meter = context.meter;
  const activeApproval = context.approvals.find((a) => a.approved);
  const occupancy = context.occupancy;
  const schedule = context.schedule;

  // 1. Authorized Operational Load
  if (activeApproval) {
    const equip = context.equipment.find((e) => e.status === 'ON');
    const evidenceIds = [activeApproval.id, meter.id];
    if (occupancy) evidenceIds.push(occupancy.id);
    if (equip) evidenceIds.push(equip.id);

    return {
      id: triageId,
      anomaly_id: anomaly.id,
      category: 'AUTHORIZED_OPERATIONAL_LOAD',
      confidence: 0.94,
      reason: `Energy load of ${anomaly.reported_power_kw} kW corresponds directly to approved research experiment "${activeApproval.title}" (Ref: ${activeApproval.reference_code}, PI: ${activeApproval.principal_investigator}).`,
      evidence: evidenceIds,
      recommended_action: 'Acknowledge operational spike. No curtailment or shutdown needed. Experiment is within authorized parameters.',
      human_review_required: true,
      llm_model: modelTag,
      prompt_version: PROMPT_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  // 2. Actionable Energy Waste: Unoccupied + HVAC/Chiller active outside hours + No approval
  if (occupancy && occupancy.headcount === 0 && occupancy.sensor_status === 'NORMAL') {
    const hvac = context.equipment.find(
      (e) => (e.category === 'HVAC' || e.category === 'UTILITY') && e.status === 'ON'
    );
    const evidenceIds = [occupancy.id, meter.id];
    if (schedule) evidenceIds.push(schedule.id);
    if (hvac) evidenceIds.push(hvac.id);

    return {
      id: triageId,
      anomaly_id: anomaly.id,
      category: 'ACTIONABLE_ENERGY_WASTE',
      confidence: 0.92,
      reason: `High power consumption (${anomaly.reported_power_kw} kW vs ${anomaly.baseline_kw} kW baseline) detected in ${anomaly.building_name} while occupancy is 0 and no approved activities or active facility schedules exist. Primary load driven by active HVAC/chiller systems.`,
      evidence: evidenceIds,
      recommended_action: 'Review and modify overnight AC schedule. Revert air handlers and chiller circuits to unoccupied setback mode upon supervisor approval.',
      human_review_required: true,
      llm_model: modelTag,
      prompt_version: PROMPT_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  // 3. Telemetry / Hardware error (checked earlier via physics, but check maintenance notes)
  const recentSensorRepair = context.maintenance_notes.find((m) =>
    m.description.toLowerCase().includes('sensor') || m.description.toLowerCase().includes('transducer')
  );
  if (recentSensorRepair && anomaly.physics_status !== 'VALID') {
    return {
      id: triageId,
      anomaly_id: anomaly.id,
      category: 'TELEMETRY_HARDWARE_ERROR',
      confidence: 0.95,
      reason: `Electrical meter telemetry is inconsistent with physical laws following maintenance activity on ${recentSensorRepair.date}: "${recentSensorRepair.description}".`,
      evidence: [meter.id, recentSensorRepair.id],
      recommended_action: 'Dispatch instrumentation technician for transducer recalibration and CT polarity check.',
      human_review_required: true,
      llm_model: modelTag,
      prompt_version: PROMPT_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  // 4. Default to UNSURE whenever evidence is insufficient
  return {
    id: triageId,
    anomaly_id: anomaly.id,
    category: 'UNSURE',
    confidence: 0.42,
    reason: 'Evidence is ambiguous or incomplete: unable to establish correlation between elevated consumption and building occupancy/scheduling records. AI refuses to hallucinate reasons without documented proof.',
    evidence: [meter.id, ...(context.schedule ? [context.schedule.id] : [])],
    recommended_action: 'Case routed to human facilities supervisor. Manual inspection of building and electrical panel recommended.',
    human_review_required: true,
    llm_model: modelTag,
    prompt_version: PROMPT_VERSION,
    timestamp: new Date().toISOString(),
  };
}
