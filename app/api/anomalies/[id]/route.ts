import { NextRequest, NextResponse } from 'next/server';
import { getAnomalyById, getAuditEventsForEntity, getDatabase, getTriageByAnomalyId } from '@/lib/db/store';
import { buildBoundedContext } from '@/lib/context/retriever';
import { validateMeterReading } from '@/lib/physics/validator';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const anomaly = getAnomalyById(id);
    if (!anomaly) {
      return NextResponse.json({ error: `Anomaly ${id} not found` }, { status: 404 });
    }

    const db = getDatabase();
    const boundedContext = buildBoundedContext(anomaly, db);
    const triage = getTriageByAnomalyId(id);
    const feedback = db.human_feedback.filter((f) => f.anomaly_id === id);
    const auditEvents = getAuditEventsForEntity(id);

    // Re-run explicit physics validation object for UI display
    const physicsEvaluation = validateMeterReading({
      voltage_v: boundedContext.meter.voltage_v,
      current_a: boundedContext.meter.current_a,
      reported_power_kw: boundedContext.meter.reported_power_kw,
      power_factor: boundedContext.meter.power_factor,
      timestamp: boundedContext.meter.timestamp,
    });

    return NextResponse.json({
      anomaly,
      context: boundedContext,
      triage,
      feedback,
      audit_events: auditEvents,
      physics_evaluation: physicsEvaluation,
    });
  } catch (error) {
    console.error('Error in /api/anomalies/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch anomaly details' }, { status: 500 });
  }
}
