# Media Compressor - Netlify Deployment Guide

This guide provides step-by-step instructions for deploying the Media Compressor web app to Netlify.

## Prerequisites

- A Netlify account
- Your Media Compressor backend API deployed somewhere (Heroku, AWS, etc.)

## Deployment Steps

### 1. Clone and prepare the repository

```bash
git clone https://github.com/yourusername/compressor.git
cd compressor/frontend
```

### 2. Configure environment variables

Create a `.env.production` file in the frontend directory with your backend URL:

```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com
```

### 3. Build the project

```bash
npm install
npm run build
```

### 4. Deploy to Netlify

#### Option A: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize and deploy:
   ```bash
   netlify init
   netlify deploy --prod
   ```

#### Option B: Deploy via Netlify UI

1. Log in to your Netlify account
2. Click "Add new site" > "Import an existing project"
3. Connect to your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `out`
5. Set environment variables:
   - Key: `NEXT_PUBLIC_BACKEND_URL`
   - Value: `https://your-backend-api.com`
   - Key: `BACKEND_URL`
   - Value: `https://your-backend-api.com`
6. Click "Deploy site"

## Testing Your Deployment

After deployment, you can test your site at the Netlify-provided URL. Make sure:

1. The frontend loads correctly
2. The backend connection works (try uploading and compressing a file)
3. Download functionality works

## Troubleshooting

### CORS Issues

If you encounter CORS errors, make sure your backend has proper CORS headers:

```javascript
app.use(cors({
  origin: ['https://your-netlify-app.netlify.app', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Backend Connection Issues

- Check that your `NEXT_PUBLIC_BACKEND_URL` environment variable is set correctly
- Verify that your backend API is running and accessible
- Check browser console for any error messages

## Local Testing

To test the static build locally:

```bash
npm run build
npm run serve
```

This will start a local server at http://localhost:5000 that simulates the Netlify environment.

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js Static Export](https://nextjs.org/docs/advanced-features/static-html-export)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
