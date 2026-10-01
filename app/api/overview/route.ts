import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';

export async function GET() {
  try {
    const db = getDatabase();

    const buildingsMonitored = db.buildings.length;
    const openAnomalies = db.anomalies.filter((a) => a.triage_status !== 'RESOLVED').length;
    const unsureCases = db.triage_results.filter((t) => t.category === 'UNSURE').length;
    const telemetryIssues = db.readings.filter((r) => r.is_quarantined || r.validation_status === 'INVALID').length;
    const potentialWasteCases = db.triage_results.filter((t) => t.category === 'ACTIONABLE_ENERGY_WASTE').length;

    // Build 24h campus aggregated load vs expected baseline chart series
    // Group readings across all buildings by hour
    const hourlyMap: Record<number, { hour: number; timeLabel: string; observed_kw: number; baseline_kw: number; count: number }> = {};

    for (let h = 0; h < 24; h++) {
      const timeLabel = `${String(h).padStart(2, '0')}:00`;
      hourlyMap[h] = { hour: h, timeLabel, observed_kw: 0, baseline_kw: 0, count: 0 };
    }

    db.readings.forEach((r) => {
      if (r.is_quarantined) return; // Do not include quarantined readings in standard load charts
      const date = new Date(r.timestamp);
      const h = date.getHours();
      if (hourlyMap[h]) {
        hourlyMap[h].observed_kw += r.reported_power_kw;
        hourlyMap[h].baseline_kw += r.expected_power_kw;
        hourlyMap[h].count += 1;
      }
    });

    // Average per building count for smooth visual
    const campusLoadTrend = Object.values(hourlyMap).map((slot) => ({
      hour: slot.hour,
      timeLabel: slot.timeLabel,
      observed_kw: Number((slot.observed_kw / Math.max(1, slot.count / 5)).toFixed(1)),
      baseline_kw: Number((slot.baseline_kw / Math.max(1, slot.count / 5)).toFixed(1)),
    }));

    return NextResponse.json({
      campus_name: 'St. Jude University Campus',
      monitoring_status: 'ACTIVE_GUARD',
      last_data_refresh: new Date().toISOString(),
      current_model_version: db.model_health.model_version,
      kpis: {
        buildings_monitored: buildingsMonitored,
        open_anomalies: openAnomalies,
        unsure_cases: unsureCases,
        telemetry_issues: telemetryIssues,
        potential_energy_waste: potentialWasteCases,
      },
      campus_load_trend: campusLoadTrend,
      buildings: db.buildings,
      recent_anomalies: db.anomalies,
      recent_triage: db.triage_results,
    });
  } catch (error) {
    console.error('Error in /api/overview:', error);
    return NextResponse.json({ error: 'Failed to fetch campus overview' }, { status: 500 });
  }
}
