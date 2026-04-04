import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  // TODO: Implement OCR slip reading
  return NextResponse.json({ message: 'OCR endpoint ready' });
}
