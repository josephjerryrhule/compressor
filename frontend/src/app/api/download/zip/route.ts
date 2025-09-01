import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  // This is just a stub since in production this will be proxied to the backend
  return NextResponse.json(
    { message: 'ZIP download is handled by the backend server' },
    { status: 200 }
  );
}
