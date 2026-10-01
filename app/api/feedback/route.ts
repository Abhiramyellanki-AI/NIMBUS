import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';

export async function GET() {
  try {
    const db = getDatabase();

    const total = db.human_feedback.length;
    const approved = db.human_feedback.filter((f) => f.human_decision === 'APPROVED').length;
    const disapproved = db.human_feedback.filter((f) => f.human_decision === 'DISAPPROVED').length;
    const acknowledged = db.human_feedback.filter((f) => f.human_decision === 'ACKNOWLEDGED').length;
    const maintenance = db.human_feedback.filter((f) => f.human_decision === 'MAINTENANCE_DISPATCHED').length;
    const resolvedCustom = db.human_feedback.filter((f) => f.human_decision === 'RESOLVED_CUSTOM').length;

    return NextResponse.json({
      feedback: db.human_feedback,
      stats: {
        total,
        agreement_rate: db.model_health.feedback_agreement_rate,
        approved,
        disapproved,
        acknowledged,
        maintenance_dispatched: maintenance,
        resolved_custom: resolvedCustom,
      },
    });
  } catch (error) {
    console.error('Error in /api/feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback records' }, { status: 500 });
  }
}
