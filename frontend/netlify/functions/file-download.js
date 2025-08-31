// netlify/functions/file-download.js

const axios = require('axios');

exports.handler = async function(event, context) {
  // Get the backend URL from environment variable
  const BACKEND_URL = process.env.BACKEND_URL || 'https://api.mediacompressor.com';
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Get filename from query parameter
  const params = event.queryStringParameters;
  const filename = params.filename;
  
  if (!filename) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing filename parameter' })
    };
  }
  
  try {
    // Request the file from backend
    const response = await axios({
      method: 'GET',
      url: `${BACKEND_URL}/uploads/${filename}`,
      responseType: 'arraybuffer'
    });
    
    // Get content type from backend response
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    
    // Determine if the file should be inline or downloaded
    const contentDisposition = `attachment; filename="${filename}"`;
    
    // Return file data
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition
      },
      body: Buffer.from(response.data).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.log('Error downloading file:', error);
    
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        message: 'Error downloading file',
        error: error.message
      })
    };
  }
};
