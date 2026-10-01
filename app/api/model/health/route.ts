import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';

export async function GET() {
  try {
    const db = getDatabase();

    return NextResponse.json({
      model_health: db.model_health,
      model_runs: [
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
          parameters: {
            n_estimators: 150,
            contamination: 0.08,
            max_samples: 256,
            bootstrap: false,
          },
        },
        ...(db.model_health.candidate_model
          ? [
              {
                id: 'run_candidate_retrained',
                model_version: db.model_health.candidate_model.model_version,
                dataset_version: `${db.model_health.dataset_version}+feedback-${db.model_health.feedback_count}`,
                random_seed: 42,
                trained_at: db.model_health.candidate_model.trained_at,
                precision: db.model_health.candidate_model.precision,
                recall: db.model_health.candidate_model.recall,
                f1: db.model_health.candidate_model.f1,
                status: db.model_health.candidate_model.passed_gate ? 'PROMOTED_TO_PRODUCTION' : 'REJECTED_BY_GATE',
                gate_passed: db.model_health.candidate_model.passed_gate,
                parameters: {
                  n_estimators: 200,
                  contamination: 0.075,
                  max_samples: 512,
                  bootstrap: true,
                },
              },
            ]
          : []),
      ],
      audit_events: db.audit_events.filter((e) => e.entity_type === 'MODEL'),
    });
  } catch (error) {
    console.error('Error in /api/model/health:', error);
    return NextResponse.json({ error: 'Failed to fetch model health' }, { status: 500 });
  }
}
