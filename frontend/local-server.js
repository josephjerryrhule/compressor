// local-server.js
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the out directory
app.use(express.static(path.join(__dirname, 'out')));

// Add API proxy middleware to forward requests to the backend
app.use('/api', createProxyMiddleware({
  target: process.env.BACKEND_URL || 'http://localhost:4000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // No rewrite needed
  },
}));

// Serve uploads via proxy
app.use('/uploads', createProxyMiddleware({
  target: process.env.BACKEND_URL || 'http://localhost:4000',
  changeOrigin: true,
}));

// For all other routes, serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}`);
  console.log(`API requests will be forwarded to ${process.env.BACKEND_URL || 'http://localhost:4000'}`);
});
