# Media Compressor - Hostinger Deployment Guide

This guide provides step-by-step instructions for deploying both the frontend and backend components of the Media Compressor application on Hostinger.

## Prerequisites

- A Hostinger account with:
  - Web Hosting plan for the frontend (Premium or Business)
  - VPS or Business hosting with Node.js support for the backend
- Domain name configured in Hostinger
- FTP client (like FileZilla) or SSH access
- Git repository with your Media Compressor code

## Part 1: Backend Deployment

### Step 1: Prepare Your Backend

1. Make sure your backend code is ready for production:

```bash
# Navigate to your backend directory
cd /Users/joeseph/Desktop/Dev/public/compressor/backend

# Install production dependencies
npm install --production
```

2. Add a proper start script to your package.json (if not already present):

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

3. Update CORS settings in your server.js file to allow requests from your domain:

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://your-domain.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Step 2: Deploy to Hostinger VPS

If using Hostinger VPS:

1. Connect to your VPS via SSH:
```bash
ssh user@your-vps-ip
```

2. Install Node.js and npm if not already installed:
```bash
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Create a directory for your backend:
```bash
mkdir -p /var/www/api.your-domain.com
```

4. Upload your backend code (from your local machine):
```bash
scp -r /Users/joeseph/Desktop/Dev/public/compressor/backend/* user@your-vps-ip:/var/www/api.your-domain.com/
```

5. Navigate to the uploaded directory and install dependencies:
```bash
cd /var/www/api.your-domain.com
npm install --production
```

6. Install PM2 to keep your Node.js application running:
```bash
sudo npm install -g pm2
```

7. Start your application with PM2:
```bash
pm2 start server.js --name "media-compressor-api"
pm2 startup
pm2 save
```

8. Set up Nginx as a reverse proxy (if needed):
```bash
sudo apt-get install nginx
```

9. Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/api.your-domain.com
```

10. Add the following configuration:
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

11. Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/api.your-domain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

12. Set up SSL with Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

### Step 3: Deploy to Hostinger Business Hosting (Alternative)

If using Hostinger Business Hosting with Node.js support:

1. Log in to your Hostinger control panel
2. Go to "Websites" > Your Domain > "Advanced" > "Node.js"
3. Create a new Node.js application
4. Set the application path to your backend directory
5. Set the startup file to server.js
6. Set the Node.js version to 18.x or later
7. Configure environment variables if needed
8. Save and restart the application

## Part 2: Frontend Deployment

### Step 1: Prepare Your Frontend

1. Update environment variables for production:

Create a `.env.production` file in your frontend directory:
```
NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com
```

2. Build your frontend for production:
```bash
# Navigate to your frontend directory
cd /Users/joeseph/Desktop/Dev/public/compressor/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

This will create a static export in the `out` directory.

### Step 2: Upload to Hostinger Web Hosting

1. Log in to your Hostinger control panel
2. Go to "Websites" > Your Domain > "File Manager"
3. Navigate to the public_html directory
4. Upload all files from your local `frontend/out` directory to the public_html directory

Alternatively, use FTP:

1. Connect to your hosting using an FTP client like FileZilla
2. Upload all files from your local `frontend/out` directory to the public_html directory

### Step 3: Configure Domain and SSL

1. In your Hostinger control panel, go to "Domains" > Your Domain
2. Make sure SSL is enabled (Use the "SSL" section to enable it if not)
3. Set up any necessary redirects (e.g., www to non-www or vice versa)

## Part 3: Connect Frontend and Backend

### Update API References

After deployment, verify that your frontend is correctly configured to use your backend API:

1. Check that the environment variable `NEXT_PUBLIC_BACKEND_URL` is correctly set to your API domain
2. Test a file upload to ensure the communication works

### Configure Backend File Storage

1. Create a dedicated directory for uploads:
```bash
# On your VPS or server
mkdir -p /var/www/api.your-domain.com/uploads
chmod 755 /var/www/api.your-domain.com/uploads
```

2. Make sure your Node.js process has write permissions to this directory

## Troubleshooting

### CORS Issues

If you encounter CORS errors:

1. Verify your backend CORS configuration includes your frontend domain
2. Check that your requests use the correct protocol (https vs http)
3. Ensure any custom headers are included in the `allowedHeaders` list

### 504 Gateway Timeout

If you experience timeout issues with large file uploads:

1. Increase Nginx timeout settings:
```nginx
# Add to your server block
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

2. Update your backend to handle large file uploads:
```javascript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

### File Upload Issues

If files aren't being uploaded properly:

1. Check file permissions on your upload directory
2. Verify that temporary files are being cleaned up
3. Increase PHP upload limits in php.ini if using PHP as a proxy

## Maintenance

### Updating Your Application

To update your application after making changes:

1. Backend:
```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install --production

# Restart with PM2
pm2 restart media-compressor-api
```

2. Frontend:
```bash
# Pull latest changes
git pull origin main

# Rebuild
npm run build

# Upload new build files to Hostinger
```

### Monitoring

Set up monitoring for your backend server:

```bash
# View PM2 status
pm2 status

# Monitor logs
pm2 logs media-compressor-api

# Set up PM2 monitoring
pm2 monitor
```

## Conclusion

Your Media Compressor application should now be fully deployed on Hostinger with:

- Frontend served as static files from Hostinger web hosting
- Backend running as a Node.js application on Hostinger VPS or Business hosting
- Proper communication between frontend and backend
- SSL security for both components

Test your application thoroughly to ensure all features work correctly in the production environment.
