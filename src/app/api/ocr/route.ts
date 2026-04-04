import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // TODO: Implement OCR slip reading
  return NextResponse.json({ message: 'OCR endpoint ready' });
}
