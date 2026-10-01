import { NextRequest, NextResponse } from 'next/server';
import { getBuildingById, getDatabase } from '@/lib/db/store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const building = getBuildingById(id);
    if (!building) {
      return NextResponse.json({ error: `Building ${id} not found` }, { status: 404 });
    }

    const db = getDatabase();

    const buildingReadings = db.readings
      .filter((r) => r.building_id === building.id)
      .slice(-48); // Last 12 hours of 15m readings

    const buildingEquipment = db.equipment.filter((e) => e.building_id === building.id);
    const buildingSchedules = db.schedules.filter((s) => s.building_id === building.id);
    const buildingOccupancy = db.occupancies.filter((o) => o.building_id === building.id);
    const buildingMaintenance = db.maintenance_notes.filter((m) => m.building_id === building.id);
    const buildingApprovals = db.approvals.filter((a) => a.building_id === building.id);
    const buildingAnomalies = db.anomalies.filter((a) => a.building_id === building.id);

    return NextResponse.json({
      building,
      readings: buildingReadings,
      equipment: buildingEquipment,
      schedules: buildingSchedules,
      occupancy: buildingOccupancy,
      maintenance_notes: buildingMaintenance,
      approvals: buildingApprovals,
      anomalies: buildingAnomalies,
    });
  } catch (error) {
    console.error('Error in /api/buildings/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch building details' }, { status: 500 });
  }
}
