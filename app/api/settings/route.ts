import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export async function GET() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json({
      errorTolerance: 15,
      powerFactor: 0.95,
      anomalyThreshold: 0.65,
      activePrompt: "v2.1.0-grounded-safety"
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
