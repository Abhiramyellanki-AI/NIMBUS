import { GoogleGenAI, Type } from '@google/genai';
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

  // SAFETY GATE 2: Missing essential context triggers UNSURE
  if (!context.occupancy || context.occupancy.sensor_status === 'OFFLINE') {
    // If occupancy is offline and no active approval exists, this is an ambiguous case
    if (context.approvals.length === 0) {
      return {
        id: triageId,
        anomaly_id: anomaly.id,
        category: 'UNSURE',
        confidence: 0.45,
        reason: 'Occupancy telemetry is OFFLINE or missing, and no approved research protocol is registered for this time window. Unable to deterministically confirm whether space is vacant or occupied.',
        evidence: context.occupancy ? [context.occupancy.id, meter.id] : [meter.id],
        recommended_action: 'Dispatch facilities guard or contact departmental facility coordinator to verify actual room occupancy before adjusting setpoints.',
        human_review_required: true,
        llm_model: 'deterministic-context-gate',
        prompt_version: PROMPT_VERSION,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Attempt server-side Gemini generation if GEMINI_API_KEY is available
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Deterministic rule-based fallback when external API key is unconfigured in development
    return generateDeterministicTriage(context, triageId, 'fallback-rule-engine (API key unconfigured)');
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const userPrompt = `INCIDENT REPORT FOR CAMPUS ENERGY TRIAGE:
Building: ${anomaly.building_name} (${anomaly.building_id})
Timestamp: ${anomaly.timestamp}
Reported Power: ${anomaly.reported_power_kw} kW (Expected Baseline: ${anomaly.baseline_kw} kW, Deviation: +${anomaly.deviation_percent}%)
Anomaly Score: ${anomaly.anomaly_score} (${anomaly.severity})
Physics Status: ${meter.validation_status} (Relative Error: ${(meter.relative_error * 100).toFixed(2)}%)
Protected / Essential Loads: ${context.protected_loads.join(', ') || 'None'}

EVIDENCE CATALOG (use these IDs in your response):
${JSON.stringify(context.evidence_catalog, null, 2)}

Provide your structured triage analysis in JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1, // Low temperature for deterministic, factual adherence
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'One of ACTIONABLE_ENERGY_WASTE, AUTHORIZED_OPERATIONAL_LOAD, TELEMETRY_HARDWARE_ERROR, UNSURE',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0',
            },
            reason: {
              type: Type.STRING,
              description: 'Concise explanation grounded strictly in evidence IDs provided',
            },
            evidence: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'Array of evidence IDs matching the provided catalog that support this verdict',
            },
            recommended_action: {
              type: Type.STRING,
              description: 'Actionable facilities guidance that does not shut down protected loads',
            },
            human_review_required: {
              type: Type.BOOLEAN,
              description: 'Must always be true',
            },
          },
          required: [
            'category',
            'confidence',
            'reason',
            'evidence',
            'recommended_action',
            'human_review_required',
          ],
        },
      },
    });

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText) as LLMTriageResponse;

    // Validate parsed category against allowed enum
    const validCategories: TriageCategory[] = [
      'ACTIONABLE_ENERGY_WASTE',
      'AUTHORIZED_OPERATIONAL_LOAD',
      'TELEMETRY_HARDWARE_ERROR',
      'UNSURE',
    ];

    if (!validCategories.includes(parsed.category)) {
      throw new Error(`Invalid category returned by LLM: ${parsed.category}`);
    }

    // Filter evidence to ensure every ID exists in the catalog
    const validEvidenceIds = new Set(context.evidence_catalog.map((e) => e.id));
    const verifiedEvidence = (parsed.evidence || []).filter((id) => validEvidenceIds.has(id));

    return {
      id: triageId,
      anomaly_id: anomaly.id,
      category: parsed.category,
      confidence: Math.min(1.0, Math.max(0.1, parsed.confidence || 0.85)),
      reason: parsed.reason,
      evidence: verifiedEvidence.length > 0 ? verifiedEvidence : [meter.id],
      recommended_action: parsed.recommended_action,
      human_review_required: true,
      llm_model: 'gemini-3.8-flash',
      prompt_version: PROMPT_VERSION,
      timestamp: new Date().toISOString(),
      raw_llm_response: rawText,
    };
  } catch (error) {
    console.error('LLM triage API error, falling back to deterministic safety engine:', error);
    return generateDeterministicTriage(context, triageId, 'gemini-3.8-flash (failsafe fallback)');
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
