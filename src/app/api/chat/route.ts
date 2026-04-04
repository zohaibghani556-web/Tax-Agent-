import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // TODO: Implement Claude API chat
  return NextResponse.json({ message: 'Chat endpoint ready' });
}
