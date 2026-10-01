import { NextRequest, NextResponse } from 'next/server';
import { triageAnomaly } from '@/lib/db/store';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const triageResult = await triageAnomaly(id);
    return NextResponse.json({
      success: true,
      triage: triageResult,
    });
  } catch (error: any) {
    console.error('Error in POST /api/anomalies/[id]/triage:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to execute triage' },
      { status: 500 }
    );
  }
}
