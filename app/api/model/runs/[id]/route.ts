import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDatabase();

    const runs = [
      {
        id: 'run_baseline_v142',
        model_version: 'isoforest-v1.4.2-campus',
        dataset_version: db.model_health.dataset_version,
        random_seed: db.model_health.random_seed,
        trained_at: '2026-09-30T22:00:00Z',
        precision: 0.942,
        recall: 0.918,
        f1: 0.930,
        status: 'DEPLOYED_ACTIVE',
        gate_passed: true,
        features_used: [
          'power_kw',
          'hour_of_day',
          'day_of_week',
          'rolling_mean_3h',
          'rolling_std_3h',
          'deviation_from_building_baseline',
        ],
        hyperparameters: {
          n_estimators: 150,
          contamination: 0.08,
          max_samples: 256,
          bootstrap: false,
          random_state: 42,
        },
        confusion_matrix: db.model_health.confusion_matrix,
        drift_metrics: {
          wasserstein_distance: 0.038,
          psi: 0.045,
          status: 'NO_SIGNIFICANT_DRIFT',
        },
      },
    ];

    const run = runs.find((r) => r.id === id) || runs[0];
    return NextResponse.json({ run });
  } catch (error) {
    console.error('Error in /api/model/runs/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch model run details' }, { status: 500 });
  }
}
