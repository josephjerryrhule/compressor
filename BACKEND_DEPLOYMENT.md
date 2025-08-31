# Backend Deployment Guide

To complete the Media Compressor application setup, you'll need to deploy the backend API separately. Here are instructions for deploying the backend to various platforms.

## Prerequisites
- Node.js runtime environment
- Access to the Media Compressor backend code
- (Optional) FFmpeg installed for video compression

## Deployment Options

### Option 1: Heroku

1. Create a Heroku account and install the Heroku CLI
2. Navigate to the backend directory:
   ```bash
   cd /path/to/compressor/backend
   ```
3. Initialize a Git repository if not already done:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
4. Create a Heroku app:
   ```bash
   heroku create media-compressor-api
   ```
5. Add the FFmpeg buildpack:
   ```bash
   heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
   ```
6. Deploy the backend:
   ```bash
   git push heroku master
   ```
7. Configure environment variables:
   ```bash
   heroku config:set NODE_ENV=production PORT=4000
   ```

### Option 2: AWS Elastic Beanstalk

1. Install the AWS CLI and EB CLI
2. Initialize an EB application:
   ```bash
   cd /path/to/compressor/backend
   eb init
   ```
3. Create an environment:
   ```bash
   eb create media-compressor-production
   ```
4. Deploy:
   ```bash
   eb deploy
   ```
5. Configure environment variables through the AWS console

### Option 3: Digital Ocean App Platform

1. Create a Digital Ocean account
2. Connect your GitHub repository
3. Create a new App from the repository
4. Select the backend directory
5. Configure environment variables
6. Deploy

## CORS Configuration

Make sure to configure CORS in your backend to allow requests from your Netlify frontend:

```javascript
// In your backend server.js or app.js
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-netlify-app.netlify.app', 
    'http://localhost:3000', 
    'http://localhost:5000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Testing Your Backend

Once deployed, test your backend API with:

```bash
curl https://your-backend-url.com/api/health
```

This should return a JSON response with status "ok" if everything is working correctly.

## Connecting Frontend to Backend

After deploying your backend, update your Netlify environment variables to point to your new backend URL:

1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Add or update the variables:
   - `NEXT_PUBLIC_BACKEND_URL`: Your backend URL (e.g., https://media-compressor-api.herokuapp.com)
   - `BACKEND_URL`: Same as above
