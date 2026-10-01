import { NextRequest, NextResponse } from 'next/server';
import { resetDatabase } from '@/lib/db/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const seed = body.seed ? Number(body.seed) : 42;
    const db = resetDatabase(seed);
    return NextResponse.json({
      success: true,
      message: `Database re-seeded deterministically with seed ${seed}`,
      seed,
      anomalies_count: db.anomalies.length,
      scenarios: [
        { id: 'anomaly_scen_1_telemetry', type: 'SCENARIO_1_TELEMETRY', building: 'Equipment_Block' },
        { id: 'anomaly_scen_2_authorized', type: 'SCENARIO_2_AUTHORIZED', building: 'Lab_A' },
        { id: 'anomaly_scen_3_waste', type: 'SCENARIO_3_WASTE', building: 'Lecture_A' },
        { id: 'anomaly_scen_4_unsure', type: 'SCENARIO_4_UNSURE', building: 'Lecture_B' },
      ],
    });
  } catch (error: any) {
    console.error('Error in /api/scenarios/reset:', error);
    return NextResponse.json({ error: error?.message || 'Failed to reset scenario database' }, { status: 500 });
  }
}
