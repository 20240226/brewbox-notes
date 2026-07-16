// Express server for brewbox-notes
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Static files: public/ and data/ directories
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/data', express.static(path.join(__dirname, 'data')));

// API: serve notes.json directly
app.get('/api/notes', (_req, res) => {
  res.sendFile(path.join(__dirname, 'data', 'notes.json'));
});

// SPA fallback — serve index.html for all non-file, non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => console.log(`Brewbox Notes running on port ${port}`));
