import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';

export async function GET() {
  try {
    const db = getDatabase();
    // Augment buildings with current anomaly count
    const buildingsWithMetrics = db.buildings.map((b) => {
      const activeAnomalies = db.anomalies.filter(
        (a) => a.building_id === b.id && a.triage_status !== 'RESOLVED'
      );
      const essentialEquip = db.equipment.filter((e) => e.building_id === b.id && e.essential);

      return {
        ...b,
        active_anomalies_count: activeAnomalies.length,
        essential_equipment_count: essentialEquip.length,
      };
    });

    return NextResponse.json({ buildings: buildingsWithMetrics });
  } catch (error) {
    console.error('Error in /api/buildings:', error);
    return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 });
  }
}
