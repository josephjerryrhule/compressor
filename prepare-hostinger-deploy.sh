#!/bin/bash

# Hostinger Deployment Script
# This script prepares your Media Compressor application for deployment on Hostinger

echo "===== Media Compressor - Hostinger Deployment Preparation ====="
echo ""

# Configuration - update these variables
FRONTEND_DIR="/Users/joeseph/Desktop/Dev/public/compressor/frontend"
BACKEND_DIR="/Users/joeseph/Desktop/Dev/public/compressor/backend"
DEPLOY_DIR="/Users/joeseph/Desktop/Dev/public/compressor/hostinger_deploy"
FRONTEND_DOMAIN="your-domain.com"
BACKEND_DOMAIN="api.your-domain.com"

# Create deployment directory structure
echo "Creating deployment directory structure..."
mkdir -p "$DEPLOY_DIR/frontend"
mkdir -p "$DEPLOY_DIR/backend"

# Prepare Frontend
echo ""
echo "===== Preparing Frontend ====="
cd "$FRONTEND_DIR"

# Create production environment file
echo "Creating production environment file..."
echo "NEXT_PUBLIC_BACKEND_URL=https://$BACKEND_DOMAIN" > .env.production

# Build frontend
echo "Building frontend for production..."
npm run build

if [ $? -ne 0 ]; then
    echo "Frontend build failed! Please fix errors and try again."
    exit 1
fi

# Copy frontend build files
echo "Copying frontend build files to deployment directory..."
cp -r out/* "$DEPLOY_DIR/frontend/"

# Create .htaccess file for SPA routing
echo "Creating .htaccess file for frontend routing..."
cat > "$DEPLOY_DIR/frontend/.htaccess" << EOL
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable GZIP compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Set browser caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/x-javascript "access plus 1 month"
  ExpiresByType application/x-shockwave-flash "access plus 1 month"
  ExpiresByType image/x-icon "access plus 1 year"
  ExpiresDefault "access plus 2 days"
</IfModule>
EOL

echo "Frontend preparation complete!"

# Prepare Backend
echo ""
echo "===== Preparing Backend ====="
cd "$BACKEND_DIR"

# Create production environment file
echo "Creating production environment file..."
cat > .env.production << EOL
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://$FRONTEND_DOMAIN
UPLOAD_DIR=/var/www/$BACKEND_DOMAIN/uploads
MAX_FILE_SIZE=500mb
EOL

# Install production dependencies
echo "Installing production dependencies..."
npm install --production

if [ $? -ne 0 ]; then
    echo "Backend dependency installation failed! Please fix errors and try again."
    exit 1
fi

# Create PM2 ecosystem file
echo "Creating PM2 ecosystem file..."
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: "media-compressor-api",
    script: "server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 4000
    }
  }]
};
EOL

# Update CORS configuration
echo "Updating CORS configuration..."
sed -i.bak "s|origin: \[\(.*\)\]|origin: ['https://$FRONTEND_DOMAIN', 'http://localhost:3000']|g" server.js

# Copy backend files
echo "Copying backend files to deployment directory..."
cp -r * "$DEPLOY_DIR/backend/"
cp .env.production "$DEPLOY_DIR/backend/"

echo "Backend preparation complete!"

# Create deployment instructions
echo ""
echo "===== Creating Deployment Instructions ====="
cat > "$DEPLOY_DIR/DEPLOYMENT_INSTRUCTIONS.md" << EOL
# Media Compressor Deployment Instructions

These files have been prepared for deployment on Hostinger.

## Frontend Deployment

Upload all files from the \`frontend\` directory to your Hostinger web hosting \`public_html\` folder.

## Backend Deployment

Upload all files from the \`backend\` directory to your Hostinger VPS or Business hosting Node.js application directory.

Follow the complete instructions in the HOSTINGER_DEPLOYMENT.md file in your project repository.
EOL

echo ""
echo "===== Deployment Preparation Complete ====="
echo ""
echo "Your files are ready for Hostinger deployment at: $DEPLOY_DIR"
echo "Frontend files: $DEPLOY_DIR/frontend"
echo "Backend files: $DEPLOY_DIR/backend"
echo ""
echo "Please follow the instructions in $DEPLOY_DIR/DEPLOYMENT_INSTRUCTIONS.md and HOSTINGER_DEPLOYMENT.md to complete your deployment."
