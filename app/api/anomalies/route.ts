import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(req.url);

    const buildingParam = searchParams.get('building');
    const categoryParam = searchParams.get('category');
    const severityParam = searchParams.get('severity');
    const statusParam = searchParams.get('status');
    const searchParam = searchParams.get('q')?.toLowerCase();

    let list = db.anomalies.map((anomaly) => {
      const triage = db.triage_results.find((t) => t.anomaly_id === anomaly.id);
      const feedback = db.human_feedback.find((f) => f.anomaly_id === anomaly.id);
      return {
        ...anomaly,
        triage,
        feedback,
      };
    });

    if (buildingParam && buildingParam !== 'ALL') {
      list = list.filter((item) => item.building_id === buildingParam);
    }

    if (categoryParam && categoryParam !== 'ALL') {
      list = list.filter((item) => item.triage?.category === categoryParam);
    }

    if (severityParam && severityParam !== 'ALL') {
      list = list.filter((item) => item.severity === severityParam);
    }

    if (statusParam && statusParam !== 'ALL') {
      list = list.filter((item) => item.triage_status === statusParam);
    }

    if (searchParam) {
      list = list.filter(
        (item) =>
          item.id.toLowerCase().includes(searchParam) ||
          (item.building_name || '').toLowerCase().includes(searchParam) ||
          item.triage?.reason?.toLowerCase().includes(searchParam)
      );
    }

    return NextResponse.json({
      anomalies: list,
      total: list.length,
    });
  } catch (error) {
    console.error('Error in /api/anomalies:', error);
    return NextResponse.json({ error: 'Failed to fetch anomalies' }, { status: 500 });
  }
}
