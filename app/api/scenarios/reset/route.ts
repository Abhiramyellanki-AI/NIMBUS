import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import { clearCache } from '@/lib/db/store';

export async function POST(req: NextRequest) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'import_datasets.py');
    console.log("Running", scriptPath);
    execSync(`python "${scriptPath}"`, { stdio: 'inherit' });
    
    const pipelinePath = path.join(process.cwd(), 'scripts', 'process_pipeline.py');
    console.log("Running", pipelinePath);
    execSync(`python "${pipelinePath}"`, { stdio: 'inherit' });
    
    // Clear the memory cache so the UI reads the newly imported database
    clearCache();

    return NextResponse.json({
      success: true,
      message: `Database re-imported from CSV datasets successfully.`
    });
  } catch (error: any) {
    console.error('Error in /api/scenarios/reset:', error);
    return NextResponse.json({ error: error?.message || 'Failed to re-import datasets' }, { status: 500 });
  }
}
