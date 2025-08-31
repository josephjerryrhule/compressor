import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Health check request received, forwarding to backend');
    // Forward request to the backend (no trailing slash)
    const response = await fetch('http://localhost:4000/api/health', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('Backend response status:', response.status);
    
    if (!response.ok) {
      console.error('Backend health check failed with status:', response.status);
      throw new Error('Backend health check failed');
    }
    
    const data = await response.json();
    console.log('Backend health check succeeded:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Health check error:', error);
    // Return a more specific error message
    return NextResponse.json(
      { status: 'error', message: 'Backend server not responding' },
      { status: 503 }
    );
  }
}
