// test-server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the out directory
app.use(express.static(path.join(__dirname, 'out')));

// Simple proxy for API requests - just for demo purposes
app.use('/api', (req, res) => {
  res.status(200).json({ message: 'This is a demo API response' });
});

// Simple proxy for uploads - just for demo purposes
app.use('/uploads/:filename', (req, res) => {
  res.status(200).send(`This would download file: ${req.params.filename}`);
});

// For all other routes, serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
