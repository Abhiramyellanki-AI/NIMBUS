import { NextResponse } from 'next/server';
import { retrainCandidateModel } from '@/lib/db/store';

export async function POST() {
  try {
    const result = retrainCandidateModel();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error during MLOps retraining:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrain model' }, { status: 500 });
  }
}
