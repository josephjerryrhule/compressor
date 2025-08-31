import { NextRequest, NextResponse } from 'next/server';

// This is a catch-all route for serving files from the backend's uploads directory
export async function GET(
  request: NextRequest,
  context: any
) {
  const { params } = context;
  try {
    // Join all parts of the filename (in case there are slashes in the filename)
    const filename = params.filename.join('/');
    
    // Build the backend URL
    const backendUrl = `http://localhost:4000/uploads/${filename}`;
    
    // Fetch the file from the backend
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `File not found: ${filename}` },
        { status: 404 }
      );
    }
    
    // Determine the content type based on filename extension
    const contentType = getContentType(filename);
    
    // Create a new response with the file content
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(`Error serving file:`, error);
    return NextResponse.json(
      { error: 'Failed to serve file', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Function to determine content type based on file extension
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
}
