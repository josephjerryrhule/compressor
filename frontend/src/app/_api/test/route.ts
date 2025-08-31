import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try direct connection to backend
    try {
      const directResponse = await fetch('http://localhost:4000/api/health');
      if (directResponse.ok) {
        const directData = await directResponse.json();
        return NextResponse.json({
          status: 'success',
          message: 'Backend is directly accessible',
          backendResponse: directData
        });
      }
    } catch (directError) {
      console.error('Direct backend connection failed:', directError);
    }
    
    // If direct connection failed or returned error, return diagnostic info
    return NextResponse.json({
      status: 'error',
      message: 'Backend connection failed',
      diagnostics: {
        nextjsVersion: '15.5.2',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
