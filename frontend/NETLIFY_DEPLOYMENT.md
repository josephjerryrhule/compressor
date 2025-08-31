# Media Compressor Web App Deployment

This document provides instructions for deploying the Media Compressor web app to Netlify.

## Prerequisites

- Netlify account
- Git repository with your code
- Backend API deployed separately (required for production use)

## Deployment Steps

### 1. Configure the Backend URL

Before deploying, ensure your backend API is deployed and accessible. Then update the environment variable in Netlify:

- `NEXT_PUBLIC_BACKEND_URL`: Set to the URL of your deployed backend API

### 2. Deploy to Netlify

#### Option 1: Deploy via Netlify UI

1. Log in to your Netlify account
2. Click "New site from Git"
3. Connect to your Git provider and select the repository
4. Configure build settings:
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/out`
5. Add the environment variable:
   - Key: `NEXT_PUBLIC_BACKEND_URL`
   - Value: Your backend API URL (e.g., `https://api.mediacompressor.com`)
6. Click "Deploy site"

#### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Navigate to the project directory: `cd frontend`
3. Login to Netlify: `netlify login`
4. Initialize the site: `netlify init`
5. Deploy: `netlify deploy --prod`

## Troubleshooting

### CORS Issues

If you encounter CORS issues, ensure your backend API has proper CORS headers:

```javascript
// In your backend server
app.use(cors({
  origin: ['https://your-netlify-site.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### API Connection Issues

If the web app cannot connect to your backend:

1. Verify the `NEXT_PUBLIC_BACKEND_URL` environment variable is correctly set
2. Ensure your backend is running and accessible
3. Check for any network issues or firewall restrictions

## Updating the Deployment

To update your deployment after making changes:

1. Push changes to your Git repository
2. Netlify will automatically rebuild and deploy (if auto-publish is enabled)
3. Or manually trigger a new deploy from the Netlify dashboard
