import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: "This endpoint requires a POST request with media files to compress" 
  }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the backend server
    const backendUrl = 'http://localhost:4000/api/compress/image';
    
    // Forward the original request directly to the backend
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: await request.arrayBuffer(),
      headers: {
        ...Object.fromEntries(request.headers),
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error forwarding to backend:', error);
    return NextResponse.json(
      { error: 'Failed to process compression request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
