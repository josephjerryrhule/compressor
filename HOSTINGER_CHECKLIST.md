# Hostinger Deployment Checklist

Use this checklist to ensure a successful deployment of Media Compressor on Hostinger.

## Account and Domain Setup
- [ ] Purchase appropriate Hostinger plan (Premium or Business for frontend)
- [ ] Purchase VPS or Business plan with Node.js for backend
- [ ] Configure domain and DNS settings
- [ ] Set up subdomains if needed (e.g., api.yourdomain.com)

## Backend Preparation
- [ ] Update CORS settings with your production domain
- [ ] Configure environment variables for production
- [ ] Test backend locally with production settings
- [ ] Optimize for performance (compression, caching, etc.)
- [ ] Set up file upload size limits and cleanup

## Frontend Preparation
- [ ] Set NEXT_PUBLIC_BACKEND_URL environment variable
- [ ] Build frontend for production (static export)
- [ ] Test static build locally
- [ ] Verify all API endpoints use the correct URL

## Backend Deployment
- [ ] Upload backend files to Hostinger VPS or Node.js hosting
- [ ] Install dependencies on server
- [ ] Set up PM2 for process management
- [ ] Configure Nginx or Apache as reverse proxy (if needed)
- [ ] Set up SSL certificate for backend domain

## Frontend Deployment
- [ ] Upload static files to Hostinger web hosting
- [ ] Configure .htaccess for SPA routing
- [ ] Set up SSL certificate for frontend domain
- [ ] Configure caching and compression

## Testing and Monitoring
- [ ] Test full application flow in production
- [ ] Verify file uploads and downloads work correctly
- [ ] Check for CORS or other browser console errors
- [ ] Set up monitoring for backend service
- [ ] Test on different devices and browsers

## Performance Optimization
- [ ] Enable Gzip/Brotli compression
- [ ] Set up browser caching headers
- [ ] Optimize image and asset delivery
- [ ] Consider CDN for static assets

## Security
- [ ] Ensure all connections use HTTPS
- [ ] Set secure headers (Content-Security-Policy, etc.)
- [ ] Configure rate limiting for API endpoints
- [ ] Set up file type validation for uploads

## Maintenance Plan
- [ ] Document deployment process
- [ ] Create backup strategy
- [ ] Plan for updates and future deployments
- [ ] Set up logging and error tracking
