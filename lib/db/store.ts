import fs from 'fs';
import path from 'path';
import {
  AnomalyRecord,
  AuditEvent,
  Building,
  HumanDecision,
  HumanFeedback,
  MeterReading,
  ModelHealthData,
  TriageResult,
} from '@/types/energy';
import { DatabaseState, generateSyntheticDataset } from '@/data/synthetic/generator';
import { buildBoundedContext } from '@/lib/context/retriever';
import { executeLLMTriage } from '@/lib/llm/triage';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

// Memory cache of DB state backed by disk persistence
let cachedState: DatabaseState | null = null;

export function getDatabase(): DatabaseState {
  if (cachedState) {
    return cachedState;
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      cachedState = JSON.parse(data) as DatabaseState;
      return cachedState;
    }
  } catch (error) {
    console.error('Failed to read database file, re-generating synthetic dataset:', error);
  }

  // Generate deterministic synthetic dataset
  const newState = generateSyntheticDataset(42);
  saveDatabase(newState);
  cachedState = newState;
  return newState;
}

export function saveDatabase(state: DatabaseState): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    cachedState = state;
  } catch (error) {
    console.error('Failed to save database file:', error);
  }
}

export function resetDatabase(seed: number = 42): DatabaseState {
  const fresh = generateSyntheticDataset(seed);
  saveDatabase(fresh);
  return fresh;
}

export function getBuildingById(id: string): Building | undefined {
  const db = getDatabase();
  return db.buildings.find((b) => b.id.toLowerCase() === id.toLowerCase());
}

export function getAnomalyById(id: string): AnomalyRecord | undefined {
  const db = getDatabase();
  return db.anomalies.find((a) => a.id === id);
}

export function getTriageByAnomalyId(anomalyId: string): TriageResult | undefined {
  const db = getDatabase();
  return db.triage_results.find((t) => t.anomaly_id === anomalyId);
}

export function getTriageById(id: string): TriageResult | undefined {
  const db = getDatabase();
  return db.triage_results.find((t) => t.id === id);
}

export function getAuditEventsForEntity(entityId: string): AuditEvent[] {
  const db = getDatabase();
  return db.audit_events.filter(
    (e) => e.entity_id === entityId || e.details.includes(entityId)
  );
}

/**
 * Executes or re-runs triage for an anomaly and persists the result
 */
export async function triageAnomaly(anomalyId: string): Promise<TriageResult> {
  const db = getDatabase();
  const anomaly = db.anomalies.find((a) => a.id === anomalyId);
  if (!anomaly) {
    throw new Error(`Anomaly ${anomalyId} not found`);
  }

  const context = buildBoundedContext(anomaly, db);
  const triageResult = await executeLLMTriage(context);

  // Update or insert triage result
  const existingIdx = db.triage_results.findIndex((t) => t.anomaly_id === anomalyId);
  if (existingIdx >= 0) {
    db.triage_results[existingIdx] = triageResult;
  } else {
    db.triage_results.unshift(triageResult);
  }

  // Update anomaly status
  anomaly.triage_status = 'TRIAGED';

  // Log audit event
  db.audit_events.unshift({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    entity_type: 'TRIAGE',
    entity_id: triageResult.id,
    action: 'TRIAGE_EVALUATED',
    details: `Triage evaluated: category=${triageResult.category}, confidence=${triageResult.confidence}, model=${triageResult.llm_model}`,
    actor: 'ai_triage_engine',
  });

  saveDatabase(db);
  return triageResult;
}

/**
 * Records a human-in-the-loop decision, updates anomaly status, logs feedback and audit event
 */
export function recordHumanDecision(
  triageId: string,
  decision: HumanDecision,
  reason: string,
  user: string = 'facilities.operator@campus.edu'
): { feedback: HumanFeedback; triage: TriageResult } {
  const db = getDatabase();
  const triage = db.triage_results.find((t) => t.id === triageId);
  if (!triage) {
    throw new Error(`Triage result ${triageId} not found`);
  }

  const anomaly = db.anomalies.find((a) => a.id === triage.anomaly_id);
  if (anomaly) {
    anomaly.triage_status = 'RESOLVED';
  }

  const feedback: HumanFeedback = {
    id: `feedback_${Date.now()}`,
    triage_id: triage.id,
    anomaly_id: triage.anomaly_id,
    building_id: anomaly ? anomaly.building_id : 'UNKNOWN',
    prediction: triage.category,
    human_decision: decision,
    reason: reason || `Action ${decision} submitted by operator`,
    user,
    timestamp: new Date().toISOString(),
    model_version: triage.llm_model,
    prompt_version: triage.prompt_version,
  };

  db.human_feedback.unshift(feedback);
  db.model_health.feedback_count += 1;

  // Recalculate human feedback agreement rate
  const total = db.human_feedback.length;
  const agreed = db.human_feedback.filter((f) => {
    if (f.prediction === 'ACTIONABLE_ENERGY_WASTE' && f.human_decision === 'APPROVED') return true;
    if (f.prediction === 'AUTHORIZED_OPERATIONAL_LOAD' && f.human_decision === 'ACKNOWLEDGED') return true;
    if (f.prediction === 'TELEMETRY_HARDWARE_ERROR' && f.human_decision === 'MAINTENANCE_DISPATCHED') return true;
    if (f.prediction === 'UNSURE' && f.human_decision === 'RESOLVED_CUSTOM') return true;
    return false;
  }).length;

  db.model_health.feedback_agreement_rate = Number((agreed / Math.max(1, total)).toFixed(3));

  // Log audit event
  db.audit_events.unshift({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    entity_type: 'DECISION',
    entity_id: feedback.id,
    action: 'HUMAN_DECISION_RECORDED',
    details: `Human decision ${decision} on triage ${triage.id} (${triage.category}). Reason: ${reason}`,
    actor: user,
  });

  saveDatabase(db);
  return { feedback, triage };
}

/**
 * Triggers MLOps candidate retraining and evaluation gate
 */
export function retrainCandidateModel(): {
  previous_model: string;
  candidate_model: string;
  gate_passed: boolean;
  metrics: { precision: number; recall: number; f1: number };
  message: string;
} {
  const db = getDatabase();
  const currentF1 = db.model_health.f1;

  // Simulate evaluation on benchmark dataset + human feedback incorporate
  const newPrecision = Number((0.95 + (Math.random() * 0.02 - 0.01)).toFixed(3));
  const newRecall = Number((0.93 + (Math.random() * 0.02 - 0.01)).toFixed(3));
  const newF1 = Number((2 * (newPrecision * newRecall) / (newPrecision + newRecall)).toFixed(3));

  const gatePassed = newF1 >= currentF1;
  const newVersion = `isoforest-v1.${parseInt(db.model_health.model_version.split('.')[1] || '4', 10) + 1}.0-campus`;

  const candidate = {
    model_version: newVersion,
    precision: newPrecision,
    recall: newRecall,
    f1: newF1,
    passed_gate: gatePassed,
    trained_at: new Date().toISOString(),
  };

  db.model_health.candidate_model = candidate;

  let message = '';
  if (gatePassed) {
    message = `Performance Gate PASSED (F1: ${newF1} >= current ${currentF1}). Candidate model ${newVersion} promoted to active production model.`;
    db.model_health.model_version = newVersion;
    db.model_health.precision = newPrecision;
    db.model_health.recall = newRecall;
    db.model_health.f1 = newF1;
    db.model_health.last_evaluation_timestamp = new Date().toISOString();
  } else {
    message = `Performance Gate FAILED (F1: ${newF1} < current ${currentF1}). Retaining active model ${db.model_health.model_version}.`;
  }

  db.audit_events.unshift({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    entity_type: 'MODEL',
    entity_id: candidate.model_version,
    action: gatePassed ? 'MODEL_PROMOTED' : 'MODEL_REJECTED',
    details: message,
    actor: 'mlops_automated_pipeline',
  });

  saveDatabase(db);

  return {
    previous_model: db.model_health.model_version,
    candidate_model: newVersion,
    gate_passed: gatePassed,
    metrics: { precision: newPrecision, recall: newRecall, f1: newF1 },
    message,
  };
}
