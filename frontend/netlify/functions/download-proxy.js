// Netlify Function to proxy file downloads from the backend server
exports.handler = async function(event, context) {
  // Get the filename from the query parameters
  const filename = event.queryStringParameters.filename;
  
  console.log(`Download request for file: ${filename}`);
  
  if (!filename) {
    console.log('Error: No filename provided');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Filename parameter is required' })
    };
  }
  
  try {
    // Build the backend URL
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const fileUrl = `${backendUrl}/uploads/${filename}`;
    
    console.log(`Attempting to fetch file from: ${fileUrl}`);
    
    // Mock response for testing when we can't connect to backend
    // This helps with static hosting where the backend isn't available yet
    if (process.env.NETLIFY_DEV === 'true' || process.env.CONTEXT === 'dev' || process.env.NODE_ENV === 'development') {
      console.log('Development mode detected - returning mock file response');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': getContentType(filename),
          'Content-Disposition': `attachment; filename="${filename}"`
        },
        body: 'This is a mock file for development purposes.',
        isBase64Encoded: false
      };
    }
    
    // Fetch the file from the backend
    const response = await fetch(fileUrl);
    
    
    if (!response.ok) {
      console.log(`Error fetching file: Status ${response.status}`);
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: `File not found: ${filename}`,
          status: response.status,
          statusText: response.statusText 
        })
      };
    }
    
    // Get the file content as array buffer
    const buffer = await response.arrayBuffer();
    console.log(`Successfully fetched file, size: ${buffer.byteLength} bytes`);
    
    // Determine the content type
    const contentType = getContentType(filename);
    
    // Return the file with proper headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error serving file:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to serve file', 
        details: error.message || String(error),
        stack: error.stack
      })
    };
  }
};

// Function to determine content type based on file extension
function getContentType(filename) {
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

// Function to determine content type based on file extension
function getContentType(filename) {
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
