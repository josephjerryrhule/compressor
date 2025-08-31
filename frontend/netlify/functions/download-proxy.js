// Netlify Function to proxy file downloads from the backend server
exports.handler = async function(event, context) {
  // Get the filename from the query parameters
  const filename = event.queryStringParameters.filename;
  
  if (!filename) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Filename parameter is required' })
    };
  }
  
  try {
    // Build the backend URL
    const backendUrl = `http://localhost:4000/uploads/${filename}`;
    
    // Fetch the file from the backend
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `File not found: ${filename}` })
      };
    }
    
    // Get the file content as array buffer
    const buffer = await response.arrayBuffer();
    
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
        details: error.message || String(error)
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
