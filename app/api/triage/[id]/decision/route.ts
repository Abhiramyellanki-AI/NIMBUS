import { NextRequest, NextResponse } from 'next/server';
import { recordHumanDecision } from '@/lib/db/store';
import { HumanDecision } from '@/types/energy';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const { decision, reason, user } = body;

    const validDecisions: HumanDecision[] = [
      'APPROVED',
      'DISAPPROVED',
      'ACKNOWLEDGED',
      'MAINTENANCE_DISPATCHED',
      'RESOLVED_CUSTOM',
    ];

    if (!validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: `Invalid decision: ${decision}. Allowed values: ${validDecisions.join(', ')}` },
        { status: 400 }
      );
    }

    const result = recordHumanDecision(
      id,
      decision,
      reason || 'Decision recorded via operations UI',
      user || 'facilities.operator@campus.edu'
    );

    return NextResponse.json({
      success: true,
      feedback: result.feedback,
      triage: result.triage,
    });
  } catch (error: any) {
    console.error('Error in POST /api/triage/[id]/decision:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record decision' },
      { status: 500 }
    );
  }
}
