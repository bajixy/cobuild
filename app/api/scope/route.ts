import { NextRequest, NextResponse } from 'next/server';
import { synthesiseScope } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const { rawInput } = await req.json();
    if (!rawInput || typeof rawInput !== 'string') {
      return NextResponse.json({ error: 'rawInput required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const brief = await synthesiseScope(rawInput, today);

    return NextResponse.json({ brief });
  } catch (e: any) {
    console.error('scope error:', e);
    return NextResponse.json({ error: e.message || 'Failed to parse' }, { status: 500 });
  }
}
