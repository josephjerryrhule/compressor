# Deploying Media Compressor to Hostinger

This guide explains how to deploy the Media Compressor frontend application to Hostinger.

## Prerequisites

1. A Hostinger account with hosting plan
2. Node.js (for building the application)
3. Your backend server running and accessible from the internet

## Build the Application

You can build the application and prepare it for deployment in two ways:

### Option 1: Manual Build

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Build the application for static export
npm run build
```

This will generate a static version of the application in the `out` directory.

### Option 2: Using the Deployment Script

We've included a convenient script to prepare the application for deployment:

```bash
# Navigate to the frontend directory
cd frontend

# Make the script executable (if needed)
chmod +x prepare-hostinger.sh

# Run the script
./prepare-hostinger.sh
```

This script will:
1. Install dependencies
2. Build the application
3. Create a zip file (`hostinger-deployment.zip`) ready for upload to Hostinger

## Testing Locally

Before uploading to Hostinger, you can test the static build locally:

```bash
# Install serve
npm install -g serve

# Serve the static build
cd frontend
serve out
```

This will start a local server with your static build.

## Hostinger Deployment Steps

1. **Log in to Hostinger Control Panel**
   
   Log in to your Hostinger account and access the control panel.

2. **Access File Manager**
   
   Navigate to File Manager from your Hostinger dashboard.

3. **Upload the Build Files**
   
   - Create a folder for your application (e.g., `compressor`)
   - Navigate to that folder
   - Upload all files from the `out` directory to this folder
   
   Alternatively, you can compress the `out` directory and upload the ZIP file, then extract it on the server.

4. **Configure .htaccess (for Apache Servers)**
   
   Create an `.htaccess` file in your application's root directory with the following content:

   ```
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

   This will ensure proper routing for your single-page application.

5. **Configure Backend API**

   The Media Compressor application needs to communicate with your backend API. There are two approaches:

   ### Option 1: Configure CORS on your Backend Server

   Make sure your backend server (running on your own server or hosting provider) has CORS enabled to accept requests from your Hostinger domain.

   ### Option 2: Set Up a Proxy on Hostinger

   If your hosting plan supports it, you can create a proxy that forwards API requests to your backend server. This can be done with:
   
   - Node.js server with Express (if you have Node.js support)
   - PHP proxy script (for shared hosting)

## Setting Up a PHP Proxy (for Shared Hosting)

Create a file called `api-proxy.php` in your application root with the following content:

```php
<?php
// API Proxy for Media Compressor
$backend_url = 'http://your-backend-server.com'; // Replace with your actual backend URL

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Get the API endpoint from the URL
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';

// Build the full backend URL
$url = $backend_url . '/' . $endpoint;

// Initialize cURL
$ch = curl_init($url);

// Set cURL options based on the request method
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Handle different HTTP methods
if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
} elseif ($method === 'PUT') {
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
} elseif ($method === 'DELETE') {
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
}

// Forward all headers
$headers = [];
foreach (getallheaders() as $name => $value) {
    if ($name !== 'Host') {
        $headers[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Execute the request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

// Close cURL
curl_close($ch);

// Set the content type header
if ($contentType) {
    header("Content-Type: $contentType");
}

// Set the HTTP status code
http_response_code($httpCode);

// Output the response
echo $response;
?>
```

Then update your application's API configuration to use this proxy:

```javascript
// In your API client configuration
const apiBaseUrl = '/api-proxy.php?endpoint=api';
```

## Troubleshooting

1. **404 Errors on Page Refresh**
   
   If you get 404 errors when refreshing pages, make sure your `.htaccess` file is correctly configured.

2. **CORS Issues**
   
   If you see CORS errors in the browser console, either:
   - Configure your backend to accept requests from your Hostinger domain
   - Set up a proxy as described above

3. **API Connectivity Issues**
   
   Make sure your backend server is accessible from the internet and that your proxy configuration (if used) is correct.

## Regular Maintenance

After deploying, to update your application:

1. Make changes to your code
2. Build again using `npm run build`
3. Upload the new build files to Hostinger

## Conclusion

Your Media Compressor application should now be accessible through your Hostinger domain. Remember to update the backend URL in your proxy configuration to point to your actual backend server.
