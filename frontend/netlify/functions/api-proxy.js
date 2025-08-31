// netlify/functions/api-proxy.js

const axios = require('axios');

exports.handler = async function(event, context) {
  // Get the backend URL from environment variable
  const BACKEND_URL = process.env.BACKEND_URL || 'https://api.mediacompressor.com';
  
  // Get the path parameter from the event
  const path = event.path.replace('/.netlify/functions/api-proxy', '');
  
  // Allow CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
  
  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    // Forward the request to the backend
    const response = await axios({
      method: event.httpMethod,
      url: `${BACKEND_URL}/api${path}`,
      data: event.body ? JSON.parse(event.body) : undefined,
      headers: event.headers,
      responseType: 'arraybuffer'
    });
    
    // Determine content type
    const contentType = response.headers['content-type'] || 'application/json';
    
    // Return the response
    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': contentType
      },
      body: contentType.includes('application/json') 
        ? JSON.stringify(response.data) 
        : Buffer.from(response.data).toString('base64'),
      isBase64Encoded: !contentType.includes('application/json')
    };
  } catch (error) {
    console.log('Error forwarding request:', error);
    
    // Return error response
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        message: 'Error forwarding request to backend',
        error: error.message
      })
    };
  }
};
