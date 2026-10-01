import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Get model health
    const health = db.model_health;
    
    // Get audit events specific to models
    const auditEvents = db.audit_events.filter(e => e.entity_type === 'MODEL');

    return NextResponse.json({
      health,
      auditEvents
    });
  } catch (error: any) {
    console.error('Error fetching MLOps data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch MLOps data' }, { status: 500 });
  }
}
