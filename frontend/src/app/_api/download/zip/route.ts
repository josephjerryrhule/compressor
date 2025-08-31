import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: "This endpoint requires a POST request with file paths to download" 
  }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the backend server
    const backendUrl = 'http://localhost:4000/api/download/zip';
    
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
    
    // Create a new response with the appropriate headers
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="compressed.zip"',
      },
    });
  } catch (error) {
    console.error('Error forwarding to backend:', error);
    return NextResponse.json(
      { error: 'Failed to download files', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
