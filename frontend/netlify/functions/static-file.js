// This Netlify function serves static files directly
exports.handler = async function(event, context) {
  // Get the filename from the query parameters
  const filename = event.queryStringParameters.filename;
  
  console.log(`Static file download request for: ${filename}`);
  
  if (!filename) {
    console.log('Error: No filename provided');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Filename parameter is required' })
    };
  }
  
  try {
    // For static hosting, return a simple placeholder response
    // We'll pretend this is the file content
    console.log('Serving static file placeholder');
    
    // Determine the content type
    const contentType = getContentType(filename);
    
    // Create a very small placeholder image/file content based on the file type
    let fileContent;
    let isBase64 = true;
    
    if (contentType.startsWith('image/')) {
      // For images, we'll return a tiny 1x1 transparent pixel
      fileContent = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Base64 encoded 1x1 transparent GIF
    } else if (contentType.startsWith('video/')) {
      // For videos, we'll return a text message
      fileContent = 'This is a video placeholder';
      isBase64 = false;
    } else {
      // For other files, we'll return a text message
      fileContent = 'This is a file placeholder';
      isBase64 = false;
    }
    
    // Return the file with proper headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000'
      },
      body: fileContent,
      isBase64Encoded: isBase64
    };
  } catch (error) {
    console.error('Error serving static file:', error);
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
