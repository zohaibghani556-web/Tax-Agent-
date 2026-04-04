import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  // TODO: Implement tax calculation
  return NextResponse.json({ message: 'Calculate endpoint ready' });
}
