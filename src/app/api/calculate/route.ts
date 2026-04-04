import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // TODO: Implement tax calculation
  return NextResponse.json({ message: 'Calculate endpoint ready' });
}
