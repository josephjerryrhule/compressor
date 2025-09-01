import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  // This is just a stub since in production this will be proxied to the backend
  return NextResponse.json(
    { status: 'healthy' },
    { status: 200 }
  );
}
